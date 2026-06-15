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

  // Inner visual of a card: uploaded photo if present, else category icon.
  function media(p) {
    if (p.photo) {
      return '<div class="project-img-grid"></div>' +
             '<img src="' + esc(p.photo) + '" alt="' + esc(p.title) + '" ' +
             'style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">';
    }
    return '<div class="project-img-grid"></div>' +
           '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
           global.ProjectStore.iconFor(p.category) + '</svg>';
  }

  function cardHTML(p, index) {
    var delay = index > 0 ? ' delay-' + (((index - 1) % 3) + 1) : '';
    return '' +
      '<div class="project-card fade-in' + delay + '" data-category="' + esc(p.category) + '">' +
        '<div class="project-img">' + media(p) + '</div>' +
        '<div class="project-body">' +
          '<span class="project-badge">' + esc(p.category) + '</span>' +
          '<h3>' + esc(p.title) + '</h3>' +
          '<p class="project-city">' + esc(p.city) + '</p>' +
        '</div>' +
      '</div>';
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
