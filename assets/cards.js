/* =====================================================================
   J Webb Inc — shared project-card renderer for the PUBLIC pages.
   Used by index.html (featured) and projects.html (all).
   Produces the same .project-card markup the site already styles.
   Every card links to its project page (project.html?id=...).
   ===================================================================== */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function projectUrl(p) {
    return 'project.html?id=' + encodeURIComponent(p.id);
  }

  // Inner visual of a card: uploaded photo if present, else category icon.
  function media(p) {
    var count = (p.photos && p.photos.length) || (p.photo ? 1 : 0);
    var chip = count > 1
      ? '<span class="project-count"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="14" rx="2"/><circle cx="12" cy="14" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/></svg>' + count + '</span>'
      : '';
    if (p.photo) {
      return '<div class="project-img-grid"></div>' +
             '<img src="' + esc(p.photo) + '" alt="' + esc(p.title) + '" loading="lazy" ' +
             'style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">' + chip;
    }
    return '<div class="project-img-grid"></div>' +
           '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
           global.ProjectStore.iconFor(p.category) + '</svg>' + chip;
  }

  function cardHTML(p, index) {
    var delay = index > 0 ? ' delay-' + (((index - 1) % 3) + 1) : '';
    return '' +
      '<a class="project-card fade-in' + delay + '" data-category="' + esc(p.category) + '" href="' + esc(projectUrl(p)) + '">' +
        '<div class="project-img">' + media(p) + '</div>' +
        '<div class="project-body">' +
          '<span class="project-badge">' + esc(p.category) + '</span>' +
          '<h3>' + esc(p.title) + '</h3>' +
          '<p class="project-city">' + esc(p.city) + '</p>' +
          '<span class="project-open">View Project' +
            '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>' +
          '</span>' +
        '</div>' +
      '</a>';
  }

  function renderGrid(grid, projects) {
    if (!grid) return;
    if (!projects.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;opacity:.6;padding:40px 0;">No projects yet.</p>';
      return;
    }
    grid.innerHTML = projects.map(cardHTML).join('');
    // Reveal immediately (these are injected after the page's observer ran).
    var cards = grid.querySelectorAll('.fade-in');
    requestAnimationFrame(function () {
      cards.forEach(function (c) { c.classList.add('is-visible'); });
    });
  }

  global.ProjectCards = { renderGrid: renderGrid, cardHTML: cardHTML, projectUrl: projectUrl };
})(window);
