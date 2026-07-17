/* =====================================================================
   J Webb Inc — Projects data layer
   ---------------------------------------------------------------------
   This is the ONLY file that knows WHERE project data lives.

   Two modes, picked automatically at page load:

   • LIVE — assets/config.js has real Supabase credentials AND the
     supabase-js CDN script loaded. Projects live in the `projects`
     table, photos in the `project-photos` storage bucket, and the
     admin login is Supabase email/password auth.
     (One-time setup: run supabase-setup.sql — see that file.)

   • DEMO — credentials missing. Everything saves to the browser's
     localStorage so the site works with zero setup, and admin.html
     falls back to its demo passcode gate.

   Contract with the pages:
     - Wait for `ProjectStore.ready` (a Promise) before first render.
     - Reads (all/featured/get/…) are synchronous from an in-memory
       cache after that.
     - Writes (add/update/remove/toggleFeatured) return Promises in
       BOTH modes and keep the cache in sync.
     - `ProjectAuth` handles sign-in for admin.html in both modes.
   ===================================================================== */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'jwebb.projects.v4'; // v4: seed trimmed to photos that exist
  var LEGACY_KEYS = ['jwebb.projects.v3', 'jwebb.projects.v2'];
  var MAX_PHOTOS = 12;
  var MAX_FEATURED = 3;
  var BUCKET = 'project-photos';

  // Categories must match the filter buttons on projects.html
  var CATEGORIES = ['Commercial', 'Government', 'Hospital', 'School', 'Industrial', 'Residential'];

  // Fallback SVG icon shown on a card when no photo was uploaded.
  var ICONS = {
    Hospital:    '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    School:      '<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6"/>',
    Government:  '<path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>',
    Commercial:  '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/>',
    Industrial:  '<path d="M2 20V8l5-5 5 5V4l5 5V4l5 5v11z"/>',
    Residential: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'
  };

  function iconFor(category) {
    return ICONS[category] || ICONS.Commercial;
  }

  /* ---------------- mode detection ---------------- */
  var cfg = global.JWEBB_CONFIG || {};
  var LIVE = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && global.supabase);
  if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !global.supabase) {
    console.warn('[JWebb] Supabase credentials found but supabase-js did not load; falling back to demo mode.');
  }
  var sb = LIVE ? global.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  /* ---------------- demo seed data ---------------- */
  function seedData() {
    var now = Date.now();
    var IMG = 'assets/img/projects/';
    // [title, category, featured, photo files (first = cover), description]
    var seed = [
      ['Lawrence Memorial Hospital — Fire Alarm Retrofit', 'Hospital',    true,
       ['hospital-retrofit.webp'],
       'Phased retrofit of an addressable fire alarm system across an occupied hospital campus — zero downtime for patient care areas.'],
      ['USD 497 Elementary School — New Construction',     'School',      true,
       ['school-new-construction.webp'],
       'Complete fire alarm design and installation for a new elementary school, coordinated with the general contractor from groundbreaking to final inspection.'],
      ['Douglas County Courthouse — System Upgrade',       'Government',  true,
       ['courthouse-upgrade.webp'],
       'Modernized a legacy panel to a fully addressable system in a historic building — new devices and wiring routed to preserve original finishes.'],
      ['Commercial Office Park — Multi-Building Install',   'Commercial',  false,
       ['office-park.webp'],
       'Networked fire alarm systems across a multi-building office campus with a single monitoring point and shared annunciation.'],
      ['Industrial Warehouse — Design & Install',          'Industrial',  false,
       ['warehouse.webp'],
       'High-bay detection design with horn/strobe coverage engineered for a 40-foot clear-height distribution warehouse.'],
      ['Senior Living Facility — Full System Replacement', 'Residential', false,
       ['senior-living.webp'],
       'Full system replacement in an occupied senior living community, sequenced wing-by-wing so residents were never without protection.'],
      ['KU Research Facility — New System Design',          'School',      false,
       ['ku-research.webp'],
       'Fire alarm design for a university research facility, including interfaces with lab equipment shutdowns and clean-agent suppression.'],
      ['Downtown Mixed-Use Building — Retrofit & Upgrade',  'Commercial',  false,
       ['downtown-mixed-use.webp'],
       'Retrofit of a renovated downtown building combining retail, office, and residential occupancies under one addressable system.'],
      ['City of Lawrence Public Library — Inspection & Service', 'Government', false,
       ['library.webp'],
       'Annual inspection, testing, and ongoing service agreement covering detection, notification, and panel maintenance.']
    ];
    return seed.map(function (row, i) {
      var photos = row[3].map(function (f) { return IMG + f; });
      return {
        id: 'seed-' + i,
        title: row[0],
        category: row[1],
        city: 'Lawrence, KS',
        description: row[4],
        photo: photos[0],
        photos: photos,
        featured: row[2],
        createdAt: now - (seed.length - i) * 1000 // keep original order
      };
    });
  }

  /* Every project carries photos[] (gallery, first = cover) and photo
     (the cover, kept for older markup). This normalizes either shape. */
  function normalizePhotos(p) {
    if (!Array.isArray(p.photos)) p.photos = p.photo ? [p.photo] : [];
    p.photo = p.photos[0] || null;
    return p;
  }

  /* ---------------- in-memory cache ---------------- */
  var cache = [];

  function fromRow(r) {
    return normalizePhotos({
      id: r.id,
      title: r.title,
      category: r.category,
      city: r.city || '',
      description: r.description || '',
      photo: r.photo || null,
      photos: Array.isArray(r.photos) ? r.photos : undefined,
      featured: !!r.featured,
      createdAt: new Date(r.created_at).getTime()
    });
  }

  /* ---------------- localStorage backend (DEMO) ---------------- */
  var demoBackend = {
    load: function () {
      try {
        var raw = global.localStorage.getItem(STORAGE_KEY);
        if (raw) return Promise.resolve(JSON.parse(raw).map(normalizePhotos));
      } catch (e) { /* ignore */ }
      var seeded = seedData();
      // Migrate: keep projects the admin added under an older key, but
      // take the fresh seed (old seed rows only had a single photo).
      try {
        for (var i = 0; i < LEGACY_KEYS.length; i++) {
          var old = global.localStorage.getItem(LEGACY_KEYS[i]);
          if (!old) continue;
          JSON.parse(old).forEach(function (p) {
            if (String(p.id).indexOf('seed-') !== 0) seeded.push(normalizePhotos(p));
          });
          global.localStorage.removeItem(LEGACY_KEYS[i]);
          break;
        }
      } catch (e) { /* ignore */ }
      demoBackend._persist(seeded);
      return Promise.resolve(seeded);
    },
    _persist: function (list) {
      try {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        throw new Error('Could not save — storage may be full. Try smaller/fewer photos.');
      }
    },
    insert: function (project) {
      project.id = 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
      cache.push(project);
      demoBackend._persist(cache);
      return Promise.resolve(project);
    },
    update: function (project) {
      demoBackend._persist(cache);
      return Promise.resolve(project);
    },
    remove: function (id) {
      cache = cache.filter(function (p) { return p.id !== id; });
      demoBackend._persist(cache);
      return Promise.resolve();
    },
    storePhoto: function (dataUrl) {
      // Demo keeps the data URL inline, as before.
      return Promise.resolve(dataUrl);
    }
  };

  /* ---------------- Supabase backend (LIVE) ---------------- */
  var liveBackend = {
    load: function () {
      return sb.from('projects').select('*').then(function (res) {
        if (res.error) throw res.error;
        return res.data.map(fromRow);
      });
    },
    insert: function (project) {
      return sb.from('projects').insert({
        title: project.title,
        category: project.category,
        city: project.city,
        description: project.description,
        photo: project.photo,
        photos: project.photos,
        featured: project.featured
      }).select().single().then(function (res) {
        if (res.error) throw res.error;
        var saved = fromRow(res.data);
        // replace the optimistic object's identity with the DB row
        for (var k in saved) project[k] = saved[k];
        cache.push(project);
        return project;
      });
    },
    update: function (project) {
      return sb.from('projects').update({
        title: project.title,
        category: project.category,
        city: project.city,
        description: project.description,
        photo: project.photo,
        photos: project.photos,
        featured: project.featured
      }).eq('id', project.id).then(function (res) {
        if (res.error) throw res.error;
        return project;
      });
    },
    remove: function (id) {
      return sb.from('projects').delete().eq('id', id).then(function (res) {
        if (res.error) throw res.error;
        cache = cache.filter(function (p) { return p.id !== id; });
      });
    },
    storePhoto: function (dataUrl) {
      // data URL -> Blob -> upload -> public URL
      return fetch(dataUrl).then(function (r) { return r.blob(); }).then(function (blob) {
        var name = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
        return sb.storage.from(BUCKET).upload(name, blob, { contentType: 'image/jpeg' })
          .then(function (res) {
            if (res.error) throw res.error;
            return sb.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
          });
      });
    }
  };

  var backend = LIVE ? liveBackend : demoBackend;

  /* If a photo value is a fresh upload (data URL), push it to storage
     first and swap in the stored URL. Existing URLs / null pass through. */
  function resolvePhoto(photo) {
    if (photo && photo.slice(0, 5) === 'data:') return backend.storePhoto(photo);
    return Promise.resolve(photo || null);
  }

  // Same, for a whole gallery. Accepts photos[] (preferred) or a single
  // photo for older callers; resolves to a clean array, capped.
  function resolvePhotos(data) {
    var list = Array.isArray(data.photos) ? data.photos
             : (data.photo ? [data.photo] : []);
    list = list.filter(Boolean).slice(0, MAX_PHOTOS);
    return Promise.all(list.map(resolvePhoto)).then(function (urls) {
      return urls.filter(Boolean);
    });
  }

  /* ---------------- public API ---------------- */
  var ProjectStore = {
    MAX_FEATURED: MAX_FEATURED,
    MAX_PHOTOS: MAX_PHOTOS,
    CATEGORIES: CATEGORIES,
    iconFor: iconFor,
    mode: LIVE ? 'live' : 'demo',

    // Resolves once the cache holds the initial data. Pages wait on
    // this before their first render; reads are synchronous after.
    ready: null, // assigned below

    // All projects, newest first.
    all: function () {
      return cache.slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
    },

    // Up to MAX_FEATURED featured projects (for the home page).
    featured: function () {
      return ProjectStore.all().filter(function (p) { return p.featured; }).slice(0, MAX_FEATURED);
    },

    featuredCount: function () {
      return cache.filter(function (p) { return p.featured; }).length;
    },

    get: function (id) {
      return cache.filter(function (p) { return p.id === id; })[0] || null;
    },

    add: function (data) {
      return resolvePhotos(data).then(function (photoUrls) {
        var project = {
          id: null,
          title: (data.title || '').trim(),
          category: data.category || CATEGORIES[0],
          city: (data.city || '').trim(),
          description: (data.description || '').trim(),
          photo: photoUrls[0] || null,
          photos: photoUrls,
          featured: false,
          createdAt: Date.now()
        };
        return backend.insert(project);
      });
    },

    update: function (id, patch) {
      var target = ProjectStore.get(id);
      if (!target) return Promise.reject(new Error('Project not found.'));
      return resolvePhotos(patch).then(function (photoUrls) {
        for (var k in patch) {
          if (k !== 'id' && k !== 'featured' && k !== 'photo' && k !== 'photos') target[k] = patch[k];
        }
        target.photos = photoUrls;
        target.photo = photoUrls[0] || null;
        return backend.update(target);
      });
    },

    remove: function (id) {
      // Each backend removes from its store AND updates the cache.
      return backend.remove(id);
    },

    // Resolves { ok: bool, error: string|null }. Enforces the max-3 rule.
    toggleFeatured: function (id) {
      var target = null, count = 0;
      cache.forEach(function (p) {
        if (p.featured) count++;
        if (p.id === id) target = p;
      });
      if (!target) return Promise.resolve({ ok: false, error: 'Project not found.' });
      if (!target.featured && count >= MAX_FEATURED) {
        return Promise.resolve({
          ok: false,
          error: 'You can feature at most ' + MAX_FEATURED + ' projects. Un-feature one first.'
        });
      }
      target.featured = !target.featured;
      return backend.update(target).then(function () {
        return { ok: true, error: null, featured: target.featured };
      }).catch(function (err) {
        target.featured = !target.featured; // roll back the cache
        throw err;
      });
    }
  };

  ProjectStore.ready = backend.load().then(function (list) {
    cache = list;
  }).catch(function (err) {
    console.error('[JWebb] Could not load projects:', err);
    cache = [];
  });

  /* ---------------- auth (for admin.html) ---------------- */
  var DEMO_PASSCODE = 'jwebb2025';
  var SESSION_KEY = 'jwebb.admin.session';
  var authed = false;

  var ProjectAuth = {
    mode: LIVE ? 'live' : 'demo',

    // Resolves true/false once any existing session has been restored.
    init: function () {
      if (!LIVE) {
        authed = global.sessionStorage.getItem(SESSION_KEY) === '1';
        return Promise.resolve(authed);
      }
      return sb.auth.getSession().then(function (res) {
        authed = !!(res.data && res.data.session);
        return authed;
      });
    },

    isAuthed: function () { return authed; },

    // Resolves on success, rejects with an Error(message) on failure.
    signIn: function (email, password) {
      if (!LIVE) {
        if (password === DEMO_PASSCODE) {
          authed = true;
          global.sessionStorage.setItem(SESSION_KEY, '1');
          return Promise.resolve();
        }
        return Promise.reject(new Error('Incorrect passcode.'));
      }
      return sb.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
        if (res.error) throw new Error(res.error.message || 'Sign-in failed.');
        authed = true;
      });
    },

    signOut: function () {
      authed = false;
      if (!LIVE) {
        global.sessionStorage.removeItem(SESSION_KEY);
        return Promise.resolve();
      }
      return sb.auth.signOut().then(function () { /* done */ });
    }
  };

  global.ProjectStore = ProjectStore;
  global.ProjectAuth = ProjectAuth;
})(window);
