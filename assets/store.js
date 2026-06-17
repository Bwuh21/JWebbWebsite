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

  var STORAGE_KEY = 'jwebb.projects.v2';
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

  // Sample projects so the demo isn't empty on first load.
  // (Mirrors the originals that used to be hard-coded into the pages.)
  function seedData() {
    var now = Date.now();
    var seed = [
      ['Lawrence Memorial Hospital — Fire Alarm Retrofit', 'Hospital',    true,  'assets/img/project-hospital.jpg'],
      ['USD 497 Elementary School — New Construction',     'School',      true,  'assets/img/project-school.jpg'],
      ['Douglas County Courthouse — System Upgrade',       'Government',  true,  'assets/img/project-courthouse.jpg'],
      ['Commercial Office Park — Multi-Building Install',   'Commercial',  false, null],
      ['Industrial Warehouse — Design & Install',          'Industrial',  false, null],
      ['Senior Living Facility — Full System Replacement', 'Residential', false, null],
      ['KU Research Facility — New System Design',          'School',      false, null],
      ['Downtown Mixed-Use Building — Retrofit & Upgrade',  'Commercial',  false, null],
      ['City of Lawrence Public Library — Inspection & Service', 'Government', false, null]
    ];
    return seed.map(function (row, i) {
      return {
        id: 'seed-' + i,
        title: row[0],
        category: row[1],
        city: 'Lawrence, KS',
        description: '',
        photo: row[3] || null,
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

  function read() { return backend.load(); }
  function write(list) { backend.save(list); }

  function newId() {
    return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  var ProjectStore = {
    MAX_FEATURED: MAX_FEATURED,
    CATEGORIES: CATEGORIES,
    iconFor: iconFor,

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
      var project = {
        id: newId(),
        title: (data.title || '').trim(),
        category: data.category || CATEGORIES[0],
        city: (data.city || '').trim(),
        description: (data.description || '').trim(),
        photo: data.photo || null,
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
