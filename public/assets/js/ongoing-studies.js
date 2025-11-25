function getBasePath() {
  const baseFromWindow = typeof window !== 'undefined' ? window.__BASE_PATH__ : '';
  const base = baseFromWindow || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

async function loadOngoingStudies() {
  try {
    const dataUrl = `${getBasePath()}data/ongoing-studies.json`;
    const response = await fetch(dataUrl);
    if (!response.ok) {
      throw new Error('Failed to load ongoing-studies.json');
    }

    const data = await response.json();
    const studies = data.studies || [];

    const tableBody = document.querySelector('#studies-table-body');
    const cardsContainer = document.querySelector('#studies-cards');
    const metaUpdated = document.querySelector('#ongoing-studies-updated');

    if (metaUpdated && data.meta && data.meta.updated_at) {
      metaUpdated.textContent = `Last updated: ${data.meta.updated_at}`;
    }

    studies.forEach((study) => {
      // ---- Table row ----
      if (tableBody) {
        const tr = document.createElement('tr');

        const studyLink = `<a href="#${study.id}">${study.short_name || study.name}</a>`;
        const countriesSetting = [...(study.countries || []), ...(study.setting || [])].join(', ');

        const focus = (study.focus || []).join(', ');
        const format = (study.setting || []).join(', ');
        const linksCell = buildLinksCell(study.links);

        tr.innerHTML = `
          <td>${studyLink}</td>
          <td>${countriesSetting}</td>
          <td>${study.population || ''}</td>
          <td>${focus}</td>
          <td>${format}</td>
          <td>${study.status || ''}</td>
          <td>${linksCell}</td>
        `;

        tableBody.appendChild(tr);
      }

      // ---- Study card ----
      if (cardsContainer) {
        const card = document.createElement('article');
        card.className = 'study-card';
        card.id = study.id;

        const tagsHtml = (study.tags || [])
          .map((tag) => `<span class="study-tag">${tag}</span>`)
          .join('');

        const linksHtml = buildLinksList(study.links);

        card.innerHTML = `
          <h3>${study.name}</h3>
          <p class="study-meta">
            <strong>Design:</strong> ${study.design || 'N/A'} ·
            <strong>Setting:</strong> ${(study.setting || []).join(', ')} ·
            <strong>Status:</strong> ${study.status || 'N/A'}
          </p>
          <p><strong>Population:</strong> ${study.population || ''}</p>
          <p><strong>Main focus:</strong> ${(study.focus || []).join(', ')}</p>
          <p><strong>Intervention:</strong> ${study.intervention || ''}</p>
          <p><strong>Comparator:</strong> ${study.comparator || ''}</p>
          <p><strong>Follow-up:</strong> ${study.follow_up || ''}</p>
          ${tagsHtml ? `<div class="study-tags">${tagsHtml}</div>` : ''}
          ${linksHtml}
        `;

        cardsContainer.appendChild(card);
      }
    });
  } catch (error) {
    console.error('Error loading ongoing studies:', error);
  }
}

function buildLinksCell(links) {
  if (!links) return '';

  const items = [];

  if (links.protocol) {
    items.push(`<a href="${links.protocol}" target="_blank" rel="noopener">Protocol</a>`);
  }
  if (links.registry) {
    items.push(`<a href="${links.registry}" target="_blank" rel="noopener">Registry</a>`);
  }
  if (links.study_page) {
    items.push(`<a href="${links.study_page}" target="_blank" rel="noopener">Study page</a>`);
  }
  if (links.lay_summary) {
    items.push(`<a href="${links.lay_summary}" target="_blank" rel="noopener">Lay summary</a>`);
  }

  return items.join(' · ');
}

function buildLinksList(links) {
  if (!links) return '';

  const items = [];

  if (links.protocol) {
    items.push(
      `<li><strong>Protocol:</strong> <a href="${links.protocol}" target="_blank" rel="noopener">${links.protocol}</a></li>`
    );
  }
  if (links.registry) {
    items.push(
      `<li><strong>Registry:</strong> <a href="${links.registry}" target="_blank" rel="noopener">${links.registry}</a></li>`
    );
  }
  if (links.study_page) {
    items.push(
      `<li><strong>Study page:</strong> <a href="${links.study_page}" target="_blank" rel="noopener">${links.study_page}</a></li>`
    );
  }
  if (links.lay_summary) {
    items.push(
      `<li><strong>Lay summary:</strong> <a href="${links.lay_summary}" target="_blank" rel="noopener">${links.lay_summary}</a></li>`
    );
  }

  if (!items.length) return '';

  return `
    <div class="study-links">
      <h4>Links</h4>
      <ul>
        ${items.join('')}
      </ul>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', loadOngoingStudies);
