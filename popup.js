console.log('popup.js loading...');

// DOM references
const $btnDarkMode = document.getElementById('btn-darkmode');
const $btnAdd = document.getElementById('btn-add');
const $btnSort = document.getElementById('btn-sort');
const $btnSettings = document.getElementById('btn-settings');
const $settingsPanel = document.getElementById('settings-panel');
const $displayMode = document.getElementById('display-mode');
const $openMode = document.getElementById('open-mode');
const $sortMode = document.getElementById('sort-mode');
const $btnResetOrder = document.getElementById('btn-reset-order');
const $btnManageSections = document.getElementById('btn-manage-sections');
const $hint = document.getElementById('open-mode-hint');
const $main = document.querySelector('main');
let $links = document.querySelectorAll('.link-group a');

// Default sections definition
const DEFAULT_SECTIONS = [
  { id: 'power-platform', name: 'Power Platform', emoji: '⚡' },
  { id: 'm365-admin', name: 'M365 Admin', emoji: '🛡️' },
  { id: 'sharepoint', name: 'SharePoint', emoji: '📁' },
  { id: 'azure', name: 'Azure', emoji: '☁️' },
  { id: 'dynamics', name: 'Dynamics 365', emoji: '📊' },
  { id: 'developer', name: 'Developer Tools', emoji: '🛠️' },
  { id: 'copilot', name: 'Copilot', emoji: '🤖' }
];

// State
let openInNewTab = true;
let sectionOrder = [];
let sortMode = 'manual'; // 'manual', 'alpha-az', 'alpha-za'
let customSections = []; // { id, name, emoji, links: [{title, url}] }
let hiddenSections = []; // Array of section IDs that are hidden
let draggedSection = null;

// Load saved preferences
chrome.storage.sync.get(['darkMode', 'openInNewTab', 'sectionOrder', 'displayMode', 'sortMode', 'customSections', 'hiddenSections', 'showWalkthrough'], (result) => {
  console.log('Storage loaded:', result);
  
  // Dark mode
  if (result.darkMode) {
    document.body.classList.add('dark');
    $btnDarkMode.textContent = '☀️';
  }
  
  // Open mode (default to new tab)
  openInNewTab = result.openInNewTab !== false;
  updateOpenMode();
  
  // Display mode
  if (result.displayMode) {
    $displayMode.value = result.displayMode;
  }
  
  // Sort mode
  sortMode = result.sortMode || 'manual';
  updateSortModeDropdown();
  updateSortButton();
  
  // Open mode dropdown
  $openMode.value = openInNewTab ? 'newtab' : 'current';
  
  // Custom sections
  customSections = result.customSections || [];
  renderCustomSections();
  
  // Hidden sections
  hiddenSections = result.hiddenSections || [];
  applyHiddenSections();
  
  // Section order
  if (result.sectionOrder && result.sectionOrder.length > 0) {
    sectionOrder = result.sectionOrder;
  }
  
  // Apply ordering
  applySectionOrder();
  
  // Show walkthrough on first install
  if (result.showWalkthrough) {
    setTimeout(() => showWalkthrough(), 300);
  }
});

// Apply hidden sections
function applyHiddenSections() {
  DEFAULT_SECTIONS.forEach(section => {
    const el = document.querySelector(`.link-group[data-group="${section.id}"]`);
    if (el) {
      el.style.display = hiddenSections.includes(section.id) ? 'none' : '';
    }
  });
}

// Toggle dark mode
$btnDarkMode.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark');
  $btnDarkMode.textContent = isDark ? '☀️' : '🌙';
  chrome.storage.sync.set({ darkMode: isDark });
});

// Toggle settings panel
$btnSettings.addEventListener('click', () => {
  $settingsPanel.hidden = !$settingsPanel.hidden;
  $btnSettings.classList.toggle('active', !$settingsPanel.hidden);
});

// Display mode change
$displayMode.addEventListener('change', () => {
  const mode = $displayMode.value;
  chrome.storage.sync.set({ displayMode: mode });
  
  if (mode === 'sidepanel') {
    alert('Side panel mode enabled. Click the extension icon to open as a side panel.');
  } else {
    alert('Popup mode enabled. Click the extension icon to open as a popup.');
  }
});

// Open mode change (from dropdown)
$openMode.addEventListener('change', () => {
  openInNewTab = $openMode.value === 'newtab';
  chrome.storage.sync.set({ openInNewTab });
  updateOpenMode();
});

// Sort mode change (from dropdown)
$sortMode.addEventListener('change', () => {
  sortMode = $sortMode.value;
  chrome.storage.sync.set({ sortMode });
  updateSortButton();
  applySectionOrder();
});

// Sort toggle button (cycles through: manual -> A-Z -> Z-A -> manual)
$btnSort.addEventListener('click', () => {
  if (sortMode === 'manual') {
    sortMode = 'alpha-az';
  } else if (sortMode === 'alpha-az') {
    sortMode = 'alpha-za';
  } else {
    sortMode = 'manual';
  }
  chrome.storage.sync.set({ sortMode });
  updateSortModeDropdown();
  updateSortButton();
  applySectionOrder();
});

function updateSortButton() {
  if (sortMode === 'alpha-az') {
    $btnSort.textContent = '🔤';
    $btnSort.title = 'Sorted A-Z (click for Z-A)';
    $btnSort.classList.add('active');
  } else if (sortMode === 'alpha-za') {
    $btnSort.textContent = '🔠';
    $btnSort.title = 'Sorted Z-A (click for manual)';
    $btnSort.classList.add('active');
  } else {
    $btnSort.textContent = '🔤';
    $btnSort.title = 'Manual order (click for A-Z)';
    $btnSort.classList.remove('active');
  }
}

function updateSortModeDropdown() {
  if (sortMode === 'alpha-az' || sortMode === 'alpha-za') {
    $sortMode.value = 'alpha';
  } else {
    $sortMode.value = 'manual';
  }
}

// Add button - show modal to add current tab
$btnAdd.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  showAddLinkModal(tab.title, tab.url);
});

// Reset section order
$btnResetOrder.addEventListener('click', () => {
  chrome.storage.sync.remove('sectionOrder', () => {
    location.reload();
  });
});

// Retake feature tour
const $btnWalkthrough = document.getElementById('btn-walkthrough');
if ($btnWalkthrough) {
  $btnWalkthrough.addEventListener('click', () => {
    $settingsPanel.hidden = true;
    $btnSettings.classList.remove('active');
    restartWalkthrough();
  });
}

// Manage Sections
$btnManageSections.addEventListener('click', () => {
  showManageSectionsModal();
});

function showManageSectionsModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  
  const sectionsHtml = DEFAULT_SECTIONS.map(section => {
    const isHidden = hiddenSections.includes(section.id);
    return `
      <label class="manage-section-item ${isHidden ? 'hidden-section' : ''}">
        <input type="checkbox" value="${section.id}" ${!isHidden ? 'checked' : ''}>
        <span>${section.emoji} ${section.name}</span>
      </label>
    `;
  }).join('');
  
  modal.innerHTML = `
    <div class="modal">
      <h3>📋 Manage Sections</h3>
      <p style="font-size: 11px; color: var(--text-secondary); margin-bottom: 12px;">
        Toggle which default sections are visible.
      </p>
      <div class="manage-sections-list">
        ${sectionsHtml}
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" id="manage-cancel">Cancel</button>
        <button class="btn-primary" id="manage-save">Save</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('#manage-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  
  modal.querySelector('#manage-save').addEventListener('click', () => {
    const checkboxes = modal.querySelectorAll('.manage-section-item input[type="checkbox"]');
    hiddenSections = [...checkboxes]
      .filter(cb => !cb.checked)
      .map(cb => cb.value);
    
    chrome.storage.sync.set({ hiddenSections }, () => {
      applyHiddenSections();
      applySectionOrder();
      updateOpenMode();
      modal.remove();
    });
  });
}

function updateOpenMode() {
  $hint.textContent = openInNewTab ? 'Click to open in new tab' : 'Click to open in current tab';
  
  $links = document.querySelectorAll('.link-group a');
  $links.forEach(link => {
    if (openInNewTab) {
      link.setAttribute('target', '_blank');
    } else {
      link.removeAttribute('target');
    }
  });
}

// === Modal for Adding Links ===
function showAddLinkModal(title, url) {
  const existingSections = customSections.map(s => 
    '<option value="' + s.id + '">' + s.emoji + ' ' + s.name + '</option>'
  ).join('');
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h3>➕ Add Link</h3>
      <div class="modal-field">
        <label>Link Title</label>
        <input type="text" id="modal-title" value="${escapeHtml(title)}">
      </div>
      <div class="modal-field">
        <label>URL</label>
        <input type="text" id="modal-url" value="${escapeHtml(url)}">
      </div>
      <div class="modal-field">
        <label>Add to Section</label>
        <select id="modal-section">
          <option value="__new__">+ Create New Section</option>
          ${existingSections}
        </select>
      </div>
      <div id="new-section-fields" style="display: block;">
        <div class="modal-field">
          <label>Section Name</label>
          <input type="text" id="modal-section-name" placeholder="My Links">
        </div>
        <div class="modal-field">
          <label>Section Emoji</label>
          <input type="text" id="modal-section-emoji" placeholder="⭐" maxlength="2">
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" id="modal-cancel">Cancel</button>
        <button class="btn-primary" id="modal-save">Add Link</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const $sectionSelect = modal.querySelector('#modal-section');
  const $newSectionFields = modal.querySelector('#new-section-fields');
  
  $sectionSelect.addEventListener('change', () => {
    $newSectionFields.style.display = $sectionSelect.value === '__new__' ? 'block' : 'none';
  });
  
  modal.querySelector('#modal-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  
  modal.querySelector('#modal-save').addEventListener('click', () => {
    const linkTitle = modal.querySelector('#modal-title').value.trim();
    const linkUrl = modal.querySelector('#modal-url').value.trim();
    const sectionId = $sectionSelect.value;
    
    if (!linkTitle || !linkUrl) { alert('Please enter a title and URL'); return; }
    
    if (sectionId === '__new__') {
      const sectionName = modal.querySelector('#modal-section-name').value.trim();
      const sectionEmoji = modal.querySelector('#modal-section-emoji').value.trim() || '⭐';
      if (!sectionName) { alert('Please enter a section name'); return; }
      
      const newSection = {
        id: 'custom-' + Date.now(),
        name: sectionName,
        emoji: sectionEmoji,
        links: [{ title: linkTitle, url: linkUrl }]
      };
      customSections.push(newSection);
    } else {
      const section = customSections.find(s => s.id === sectionId);
      if (section) section.links.push({ title: linkTitle, url: linkUrl });
    }
    
    chrome.storage.sync.set({ customSections });
    renderCustomSections();
    applySectionOrder();
    updateOpenMode();
    modal.remove();
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/"/g, '&quot;');
}

// === Render Custom Sections ===
function renderCustomSections() {
  document.querySelectorAll('.link-group.custom-section').forEach(el => el.remove());
  
  customSections.forEach(section => {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'link-group custom-section';
    sectionEl.dataset.group = section.id;
    sectionEl.setAttribute('draggable', 'true');
    
    const linksHtml = section.links.map((link, idx) => `
      <li class="link-item">
        <a href="${escapeHtml(link.url)}" target="_blank">${escapeHtml(link.title)}</a>
        <button class="btn-delete-link" data-section="${section.id}" data-idx="${idx}" title="Remove link">✕</button>
      </li>
    `).join('');
    
    sectionEl.innerHTML = `
      <div class="section-header">
        <h2><span class="drag-handle">⋮⋮</span>${section.emoji} ${escapeHtml(section.name)}</h2>
        <button class="btn-delete-section" data-section="${section.id}" title="Delete section">🗑️</button>
      </div>
      <ul>${linksHtml}</ul>
    `;
    
    $main.appendChild(sectionEl);
  });
  
  document.querySelectorAll('.btn-delete-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      deleteLink(btn.dataset.section, parseInt(btn.dataset.idx));
    });
  });
  
  document.querySelectorAll('.btn-delete-section').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (confirm('Delete this section and all its links?')) deleteSection(btn.dataset.section);
    });
  });
}

function deleteLink(sectionId, linkIdx) {
  const section = customSections.find(s => s.id === sectionId);
  if (section) {
    section.links.splice(linkIdx, 1);
    if (section.links.length === 0) customSections = customSections.filter(s => s.id !== sectionId);
    chrome.storage.sync.set({ customSections });
    renderCustomSections();
    applySectionOrder();
    updateOpenMode();
  }
}

function deleteSection(sectionId) {
  customSections = customSections.filter(s => s.id !== sectionId);
  chrome.storage.sync.set({ customSections });
  renderCustomSections();
  applySectionOrder();
  updateOpenMode();
}

// === Drag and Drop for Sections ===
function setupDragAndDrop() {
  document.querySelectorAll('.link-group').forEach(section => {
    section.addEventListener('dragstart', handleDragStart);
    section.addEventListener('dragend', handleDragEnd);
    section.addEventListener('dragover', handleDragOver);
    section.addEventListener('dragleave', handleDragLeave);
    section.addEventListener('drop', handleDrop);
  });
}

function handleDragStart(e) {
  draggedSection = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.group);
}

function handleDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.link-group').forEach(s => s.classList.remove('drag-over'));
  draggedSection = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (this !== draggedSection) this.classList.add('drag-over');
}

function handleDragLeave() { this.classList.remove('drag-over'); }

function handleDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  
  if (this !== draggedSection && draggedSection) {
    const allSections = [...document.querySelectorAll('.link-group')];
    const draggedIndex = allSections.indexOf(draggedSection);
    const targetIndex = allSections.indexOf(this);
    
    if (draggedIndex < targetIndex) {
      this.parentNode.insertBefore(draggedSection, this.nextSibling);
    } else {
      this.parentNode.insertBefore(draggedSection, this);
    }
    
    saveSectionOrder();
    updateOpenMode();
  }
}

function saveSectionOrder() {
  sectionOrder = [...document.querySelectorAll('.link-group')].map(s => s.dataset.group);
  chrome.storage.sync.set({ sectionOrder });
}

function applySectionOrder() {
  const container = $main;
  const sections = [...document.querySelectorAll('.link-group')];
  
  if (sortMode === 'alpha-az' || sortMode === 'alpha-za') {
    sections.sort((a, b) => {
      const titleA = a.querySelector('h2').textContent.replace(/[^\w\s]/g, '').trim().toLowerCase();
      const titleB = b.querySelector('h2').textContent.replace(/[^\w\s]/g, '').trim().toLowerCase();
      const result = titleA.localeCompare(titleB);
      return sortMode === 'alpha-za' ? -result : result;
    });
    
    sections.forEach(s => {
      s.setAttribute('draggable', 'false');
      s.classList.add('no-drag');
    });
  } else {
    if (sectionOrder.length > 0) {
      sections.sort((a, b) => {
        const indexA = sectionOrder.indexOf(a.dataset.group);
        const indexB = sectionOrder.indexOf(b.dataset.group);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }
    
    sections.forEach(s => {
      s.setAttribute('draggable', 'true');
      s.classList.remove('no-drag');
    });
  }
  
  sections.forEach(section => container.appendChild(section));
  setupDragAndDrop();
}

setupDragAndDrop();

// === Feature Walkthrough ===
const walkthroughSteps = [
  {
    target: '#btn-add',
    title: '➕ Add Your Own Links',
    description: 'Click here to add any webpage as a quick link. You can create custom sections to organize your links.',
    position: 'bottom'
  },
  {
    target: '#btn-sort',
    title: '🔤 Sort & Organize',
    description: 'Click to cycle through sorting options: alphabetical A-Z, Z-A, or manual. Drag sections to reorder them manually.',
    position: 'bottom'
  },
  {
    target: '#btn-settings',
    title: '⚙️ Preferences',
    description: 'Access settings to change display mode (popup or side panel), link behavior, and manage which sections are visible.',
    position: 'bottom'
  },
  {
    target: '#btn-darkmode',
    title: '🌙 Dark Mode',
    description: 'Toggle between light and dark themes for comfortable viewing.',
    position: 'bottom'
  },
  {
    target: '.link-group',
    title: '⋮⋮ Drag to Reorder',
    description: 'Grab any section by its header and drag to rearrange. Your custom order is saved automatically.',
    position: 'right'
  }
];

let currentWalkthroughStep = 0;
let walkthroughOverlay = null;

function showWalkthrough() {
  // Show welcome modal first
  const welcomeOverlay = document.createElement('div');
  welcomeOverlay.className = 'walkthrough-overlay';
  
  const welcomeModal = document.createElement('div');
  welcomeModal.className = 'walkthrough-welcome';
  welcomeModal.innerHTML = `
    <div class="walkthrough-welcome-emoji">👋</div>
    <h2>Welcome!</h2>
    <p>Thanks for installing M365 Admin Quick Links. Would you like a quick tour of the features?</p>
    <div class="walkthrough-welcome-actions">
      <button class="walkthrough-btn-start">Take the Tour</button>
      <button class="walkthrough-btn-dismiss">Skip for Now</button>
    </div>
  `;
  
  welcomeOverlay.appendChild(welcomeModal);
  document.body.appendChild(welcomeOverlay);
  
  welcomeModal.querySelector('.walkthrough-btn-start').addEventListener('click', () => {
    welcomeOverlay.remove();
    startWalkthroughSteps();
  });
  
  welcomeModal.querySelector('.walkthrough-btn-dismiss').addEventListener('click', () => {
    welcomeOverlay.remove();
    chrome.storage.sync.set({ showWalkthrough: false });
  });
}

function startWalkthroughSteps() {
  currentWalkthroughStep = 0;
  showWalkthroughStep(currentWalkthroughStep);
}

function showWalkthroughStep(stepIndex) {
  // Clean up previous step
  cleanupWalkthrough();
  
  if (stepIndex >= walkthroughSteps.length) {
    finishWalkthrough();
    return;
  }
  
  const step = walkthroughSteps[stepIndex];
  const targetEl = document.querySelector(step.target);
  
  if (!targetEl) {
    // Skip to next step if target not found
    showWalkthroughStep(stepIndex + 1);
    return;
  }
  
  // Create overlay (but we'll use box-shadow for darkening)
  walkthroughOverlay = document.createElement('div');
  walkthroughOverlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:299;pointer-events:none;';
  document.body.appendChild(walkthroughOverlay);
  
  // Highlight target
  targetEl.classList.add('walkthrough-highlight');
  
  // Scroll target into view if needed
  targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'walkthrough-tooltip';
  
  // Step indicators
  const dotsHtml = walkthroughSteps.map((_, i) => {
    const state = i < stepIndex ? 'completed' : (i === stepIndex ? 'active' : '');
    return `<div class="walkthrough-step-dot ${state}"></div>`;
  }).join('');
  
  tooltip.innerHTML = `
    <div class="walkthrough-step-indicator">${dotsHtml}</div>
    <div class="walkthrough-title">${step.title}</div>
    <div class="walkthrough-description">${step.description}</div>
    <div class="walkthrough-actions">
      <button class="walkthrough-btn walkthrough-btn-skip">Skip</button>
      <button class="walkthrough-btn walkthrough-btn-next">${stepIndex === walkthroughSteps.length - 1 ? 'Finish' : 'Next'}</button>
    </div>
  `;
  
  document.body.appendChild(tooltip);
  
  // Position tooltip
  positionTooltip(tooltip, targetEl, step.position);
  
  // Button handlers
  tooltip.querySelector('.walkthrough-btn-skip').addEventListener('click', () => {
    finishWalkthrough();
  });
  
  tooltip.querySelector('.walkthrough-btn-next').addEventListener('click', () => {
    currentWalkthroughStep++;
    showWalkthroughStep(currentWalkthroughStep);
  });
}

function positionTooltip(tooltip, targetEl, position) {
  const targetRect = targetEl.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const padding = 12;
  
  let top, left;
  let arrowClass = 'arrow-top';
  
  switch (position) {
    case 'bottom':
      top = targetRect.bottom + padding;
      left = Math.max(8, Math.min(targetRect.left, window.innerWidth - tooltipRect.width - 8));
      arrowClass = 'arrow-top';
      break;
    case 'top':
      top = targetRect.top - tooltipRect.height - padding;
      left = Math.max(8, Math.min(targetRect.left, window.innerWidth - tooltipRect.width - 8));
      arrowClass = 'arrow-bottom';
      break;
    case 'right':
      top = targetRect.top;
      left = Math.min(targetRect.right + padding, window.innerWidth - tooltipRect.width - 8);
      arrowClass = 'arrow-left';
      break;
    case 'left':
      top = targetRect.top;
      left = Math.max(8, targetRect.left - tooltipRect.width - padding);
      arrowClass = 'arrow-right';
      break;
    default:
      top = targetRect.bottom + padding;
      left = 8;
  }
  
  // Ensure tooltip stays within viewport
  if (top + tooltipRect.height > window.innerHeight - 8) {
    top = window.innerHeight - tooltipRect.height - 8;
  }
  if (top < 8) top = 8;
  
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
  tooltip.classList.add(arrowClass);
}

function cleanupWalkthrough() {
  // Remove highlight from all elements
  document.querySelectorAll('.walkthrough-highlight').forEach(el => {
    el.classList.remove('walkthrough-highlight');
  });
  
  // Remove tooltip
  document.querySelectorAll('.walkthrough-tooltip').forEach(el => el.remove());
  
  // Remove overlay
  if (walkthroughOverlay) {
    walkthroughOverlay.remove();
    walkthroughOverlay = null;
  }
}

function finishWalkthrough() {
  cleanupWalkthrough();
  chrome.storage.sync.set({ showWalkthrough: false });
}

// Allow manually triggering walkthrough from settings
function restartWalkthrough() {
  showWalkthrough();
}
