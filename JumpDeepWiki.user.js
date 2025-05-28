// ==UserScript==
// @name         JumpDeepWiki
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在 GitHub 仓库直接跳转 DeepWiki
// @author       lzhcccccch
// @icon         https://www.google.com/s2/favicons?domain=deepwiki.com
// @match        https://github.com/*/*
// @updateURL    https://raw.githubusercontent.com/lzhcccccch/tampermonkey-scripts/main/JumpDeepWiki.user.js
// @downloadURL  https://raw.githubusercontent.com/lzhcccccch/tampermonkey-scripts/main/JumpDeepWiki.user.js
// @grant        GM_addStyle
// ==/UserScript==

(function() {
  'use strict';

  // 添加按钮样式
  GM_addStyle(`
      .deepwiki-button {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 6px 12px !important;
          border-radius: 6px !important;
          text-decoration: none !important;
          font-weight: 500 !important;
          font-size: 14px !important;
          border: 1px solid #0969da !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          background: #0969da !important;
          color: white !important;
          margin-left: 8px !important;
      }

      .deepwiki-button:hover {
          background: #0860ca !important;
          border-color: #0860ca !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 3px 8px rgba(9, 105, 218, 0.3) !important;
          text-decoration: none !important;
          color: white !important;
      }

      .deepwiki-button:active {
          transform: translateY(0) !important;
          box-shadow: 0 1px 3px rgba(9, 105, 218, 0.3) !important;
      }

      .deepwiki-icon {
          width: 16px !important;
          height: 16px !important;
          fill: currentColor !important;
      }
  `);

  // 检查是否为GitHub项目页面
  function isProjectPage() {
      const path = window.location.pathname;
      const parts = path.split('/').filter(part => part);
      return parts.length >= 2 && !parts[0].startsWith('@');
  }

  // 获取项目信息
  function getProjectInfo() {
      const path = window.location.pathname;
      const parts = path.split('/').filter(part => part);
      return {
          username: parts[0],
          repo: parts[1],
          isValid: parts.length >= 2
      };
  }

  // 创建DeepWiki按钮
  function createDeepWikiButton() {
      const { username, repo, isValid } = getProjectInfo();
      
      if (!isValid) return null;

      const button = document.createElement('a');
      button.className = 'deepwiki-button';
      button.href = `https://deepwiki.com/${username}/${repo}`;
      button.target = '_blank';
      button.rel = 'noopener noreferrer';
      button.title = `在 DeepWiki 中查看 ${username}/${repo}`;
      button.setAttribute('data-deepwiki-button', 'true');

      // 添加图标和文本
      button.innerHTML = `
          <svg class="deepwiki-icon" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          DeepWiki
      `;

      return button;
  }

  // 查找合适的容器插入按钮
  function findContainer() {
      const selectors = [
          '.UnderlineNav-body',
          '.UnderlineNav ul',
          'nav[aria-label="Repository"] ul',
          '.reponav',
          'nav.js-repo-nav ul',
          '.pagehead-actions',
          '.BorderGrid-cell h1 + div',
          '.PageHeader-item--end'
      ];

      for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
              return element;
          }
      }
      return null;
  }

  // 插入DeepWiki按钮
  function insertDeepWikiButton() {
      if (!isProjectPage()) return false;
      
      // 检查是否已存在按钮
      if (document.querySelector('[data-deepwiki-button]')) return false;

      const container = findContainer();
      if (!container) return false;

      const button = createDeepWikiButton();
      if (!button) return false;

      try {
          // 根据容器类型决定插入方式
          if (container.tagName === 'UL') {
              const li = document.createElement('li');
              li.appendChild(button);
              container.appendChild(li);
          } else {
              container.appendChild(button);
          }
          return true;
      } catch (error) {
          console.error('DeepWiki Jump: 插入按钮失败', error);
          return false;
      }
  }

  // 防抖函数
  function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
          const later = () => {
              clearTimeout(timeout);
              func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
      };
  }

  // 创建防抖版本的插入函数
  const debouncedInsert = debounce(insertDeepWikiButton, 300);

  // 设置观察器监听DOM变化
  function setupObservers() {
      let lastURL = location.href;

      // DOM变化观察器
      const observer = new MutationObserver(() => {
          if (isProjectPage()) {
              debouncedInsert();
          }
      });

      // URL变化观察器
      const urlObserver = new MutationObserver(() => {
          if (location.href !== lastURL) {
              lastURL = location.href;
              setTimeout(() => {
                  if (isProjectPage()) {
                      insertDeepWikiButton();
                  }
              }, 100);
          }
      });

      // 开始观察
      observer.observe(document.body, {
          childList: true,
          subtree: true
      });

      urlObserver.observe(document, {
          subtree: true,
          childList: true
      });
  }

  // 初始化函数
  function initialize() {
      setupObservers();
      
      // 尝试多次插入按钮，处理动态加载
      const attempts = [0, 500, 1000, 2000];
      attempts.forEach(delay => {
          setTimeout(insertDeepWikiButton, delay);
      });
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
  } else {
      initialize();
  }

})();
