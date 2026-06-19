/* =====================================================================
   J Webb Inc — shared project-card renderer for the PUBLIC pages.
   Used by index-variation-2.html (featured) and projects.html (all).
   Produces the same .project-card markup the site already styles.
   ===================================================================== */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function coverOf(p) {
    return global.ProjectStore.coverOf ? global.ProjectStore.coverOf(p) : p.photo;
  }
  function photoCount(p) {
    return global.ProjectStore.photosOf ? global.ProjectStore.photosOf(p).length : (p.photo ? 1 : 0);
  }

  // Inner visual of a card: cover photo if present, else category icon.
  function media(p) {
    var cover = coverOf(p);
    var n = photoCount(p);
    var badge = n > 1
      ? '<span class="project-count">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>' +
          '</svg>' + n + '</span>'
      : '';
    if (cover) {
      return '<div class="project-img-grid"></div>' +
             '<img src="' + esc(cover) + '" alt="' + esc(p.title) + '" ' +
             'style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">' +
             badge +
             '<span class="project-view">View project<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>';
    }
    return '<div class="project-img-grid"></div>' +
           '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
           global.ProjectStore.iconFor(p.category) + '</svg>' +
           '<span class="project-view">View project<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>';
  }

  function cardHTML(p, index) {
    var delay = index > 0 ? ' delay-' + (((index - 1) % 3) + 1) : '';
    return '' +
      '<a class="project-card fade-in' + delay + '" href="project.html?id=' + encodeURIComponent(p.id) + '" data-category="' + esc(p.category) + '">' +
        '<div class="project-img">' + media(p) + '</div>' +
        '<div class="project-body">' +
          '<span class="project-badge">' + esc(p.category) + '</span>' +
          '<h3>' + esc(p.title) + '</h3>' +
          '<p class="project-city">' + esc(p.city) + '</p>' +
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

  global.ProjectCards = { renderGrid: renderGrid, cardHTML: cardHTML };
})(window);
