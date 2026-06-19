/* =====================================================================
   J Webb Inc — Projects data layer  (DEMO build)
   ---------------------------------------------------------------------
   This is the ONLY file that knows WHERE project data lives.
   Right now it saves to the browser's localStorage so the demo works
   with zero setup and zero cost.

   >> TO SCALE LATER (Supabase / any real backend):
      Re-implement the methods inside `backend` below to call your API
      instead of localStorage. Nothing else on the site has to change —
      admin.html, projects.html and the home page all talk to this same
      ProjectStore object.
   ===================================================================== */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'jwebb.projects.v3';
  var MAX_FEATURED = 3;

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

  // The handful of real photos we ship with the demo. Galleries are built by
  // reusing one "hero" shot many times — the public gallery crops each tile to
  // a different region/zoom, so one source image reads as a varied photo set.
  var IMG = {
    hospital:   'assets/img/project-hospital.jpg',
    school:     'assets/img/project-school.jpg',
    courthouse: 'assets/img/project-courthouse.jpg',
    building:   'assets/img/hero-building.jpg',
    interior:   'assets/img/about-building.jpg'
  };

  // Build a demo gallery from a single hero image (repeated). The gallery
  // renderer gives each tile its own crop + size, so it looks like many photos.
  function gallery(src, count) {
    var out = [];
    for (var i = 0; i < (count || 6); i++) out.push(src);
    return out;
  }

  // Sample projects so the demo isn't empty on first load.
  // (Mirrors the originals that used to be hard-coded into the pages.)
  function seedData() {
    var now = Date.now();
    var seed = [
      ['Lawrence Memorial Hospital — Fire Alarm Retrofit',       'Hospital',    true,  IMG.hospital,   8],
      ['USD 497 Elementary School — New Construction',           'School',      true,  IMG.school,     7],
      ['Douglas County Courthouse — System Upgrade',             'Government',  true,  IMG.courthouse, 7],
      ['Commercial Office Park — Multi-Building Install',        'Commercial',  false, IMG.building,   6],
      ['Industrial Warehouse — Design & Install',               'Industrial',  false, IMG.building,   6],
      ['Senior Living Facility — Full System Replacement',      'Residential', false, IMG.interior,   6],
      ['KU Research Facility — New System Design',               'School',      false, IMG.school,     6],
      ['Downtown Mixed-Use Building — Retrofit & Upgrade',      'Commercial',  false, IMG.building,   7],
      ['City of Lawrence Public Library — Inspection & Service', 'Government',  false, IMG.courthouse, 6]
    ];
    return seed.map(function (row, i) {
      var photos = row[3] ? gallery(row[3], row[4]) : [];
      return {
        id: 'seed-' + i,
        title: row[0],
        category: row[1],
        city: 'Lawrence, KS',
        description: 'Complete fire alarm life-safety scope — design, device installation, ' +
                     'panel programming, and final acceptance testing — delivered on schedule ' +
                     'with minimal disruption to the occupied facility.',
        photos: photos,
        photo: row[3] || null,            // legacy cover field (kept in sync)
        featured: row[2],
        createdAt: now - (seed.length - i) * 1000 // keep original order
      };
    });
  }

  /* ---- Storage backend (swap this block for Supabase later) ---- */
  var backend = {
    load: function () {
      try {
        var raw = global.localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) { /* ignore */ }
      var seeded = seedData();
      backend.save(seeded);
      return seeded;
    },
    save: function (list) {
      try {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        alert('Could not save — storage may be full. Try smaller/fewer photos.');
      }
    }
  };

  // Make sure every record has a photos[] array, even legacy single-photo ones.
  function normalize(p) {
    if (!Array.isArray(p.photos)) {
      p.photos = p.photo ? [p.photo] : [];
    }
    if (!p.photo && p.photos.length) p.photo = p.photos[0];
    return p;
  }

  function read() { return backend.load().map(normalize); }
  function write(list) { backend.save(list); }

  // Cover image for a project: first gallery photo, else legacy field, else null.
  function coverOf(p) {
    if (p && p.photos && p.photos.length) return p.photos[0];
    return (p && p.photo) || null;
  }
  function photosOf(p) {
    if (p && p.photos && p.photos.length) return p.photos;
    return p && p.photo ? [p.photo] : [];
  }

  function newId() {
    return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  var ProjectStore = {
    MAX_FEATURED: MAX_FEATURED,
    CATEGORIES: CATEGORIES,
    iconFor: iconFor,
    coverOf: coverOf,
    photosOf: photosOf,

    // All projects, newest first.
    all: function () {
      return read().slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
    },

    // Up to MAX_FEATURED featured projects (for the home page).
    featured: function () {
      return ProjectStore.all().filter(function (p) { return p.featured; }).slice(0, MAX_FEATURED);
    },

    featuredCount: function () {
      return read().filter(function (p) { return p.featured; }).length;
    },

    get: function (id) {
      return read().filter(function (p) { return p.id === id; })[0] || null;
    },

    add: function (data) {
      var list = read();
      var photos = Array.isArray(data.photos) ? data.photos.slice() : (data.photo ? [data.photo] : []);
      var project = {
        id: newId(),
        title: (data.title || '').trim(),
        category: data.category || CATEGORIES[0],
        city: (data.city || '').trim(),
        description: (data.description || '').trim(),
        photos: photos,
        photo: photos[0] || null,    // keep legacy cover field in sync
        featured: false,
        createdAt: Date.now()
      };
      list.push(project);
      write(list);
      return project;
    },

    update: function (id, patch) {
      var list = read();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) {
          for (var k in patch) {
            if (k !== 'id' && k !== 'featured') list[i][k] = patch[k];
          }
          if (Array.isArray(patch.photos)) list[i].photo = patch.photos[0] || null;
          write(list);
          return list[i];
        }
      }
      return null;
    },

    remove: function (id) {
      write(read().filter(function (p) { return p.id !== id; }));
    },

    // Returns { ok: bool, error: string|null }. Enforces the max-3 rule.
    toggleFeatured: function (id) {
      var list = read();
      var target = null, count = 0;
      list.forEach(function (p) {
        if (p.featured) count++;
        if (p.id === id) target = p;
      });
      if (!target) return { ok: false, error: 'Project not found.' };

      if (!target.featured && count >= MAX_FEATURED) {
        return { ok: false, error: 'You can feature at most ' + MAX_FEATURED + ' projects. Un-feature one first.' };
      }
      target.featured = !target.featured;
      write(list);
      return { ok: true, error: null, featured: target.featured };
    }
  };

  global.ProjectStore = ProjectStore;
})(window);
