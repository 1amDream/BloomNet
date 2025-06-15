        document.addEventListener('DOMContentLoaded', function() {
      const searchForm = document.getElementById('search-form');
      const searchInput = document.getElementById('search-input');
      const resultsList = document.getElementById('results');
      const articleSection = document.getElementById('article');
      const articleTitle = document.getElementById('article-title');
      const articleContent = document.getElementById('article-content');
      const backButton = document.getElementById('back-button');
      const infoPanel = document.getElementById('info-panel');
      const loadingSpinner = document.getElementById('loading-spinner');

      const searchApiUrl =
        'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=';
      const pageParseApiBase = 'https://en.wikipedia.org/w/api.php?action=parse&format=json&origin=*&prop=text&page=';

      async function fetchDidYouKnow() {
        try {
          const response = await fetch('https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=random&rnnamespace=0&rnlimit=1');
          if (!response.ok) throw new Error('Failed fetching random fact');
          const data = await response.json();
          if (data.query.random && data.query.random.length > 0) {
            const title = data.query.random[0].title;
            const summaryResp = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title));
            if (!summaryResp.ok) throw new Error('Failed fetching summary');
            const summaryData = await summaryResp.json();
            if (summaryData.extract) {
              infoPanel.textContent = `📚 Did you know? ${summaryData.extract}`;
            }
          }
        } catch(e) {
          infoPanel.textContent = 'Welcome! Search any topic to explore Wikipedia\'s vast knowledge.';
          console.warn('Did you know fetch error:', e);
        }
      }
      fetchDidYouKnow();

      function showLoading(show) {
        loadingSpinner.style.display = show ? 'inline-block' : 'none';
        searchInput.disabled = show;
        searchForm.querySelector('button[type="submit"]').disabled = show;
      }

      function clearResults() {
        resultsList.innerHTML = '';
        resultsList.style.display = 'block';
      }

      function clearArticle() {
        articleTitle.textContent = '';
        articleContent.innerHTML = '';
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      function displayResults(results) {
        clearResults();
        clearArticle();
        articleSection.hidden = true;
        if (results.length === 0) {
          resultsList.innerHTML = '<li>No results found.</li>';
          return;
        }
        results.forEach((result, index) => {
          const li = document.createElement('li');
          li.tabIndex = 0;
          li.setAttribute('role', 'button');
          li.setAttribute('aria-pressed', 'false');
          li.style.animationDelay = (index * 0.05 + 0.05) + 's';
          const title = document.createElement('h3');
          title.innerHTML = escapeHtml(result.title);
          const snippet = document.createElement('p');
          snippet.innerHTML = result.snippet + '...';
          li.appendChild(title);
          li.appendChild(snippet);
          li.addEventListener('click', () => {
            loadArticle(result.title);
          });
          li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              loadArticle(result.title);
            }
          });
          resultsList.appendChild(li);
        });
      }

      async function loadArticle(title) {
        try {
          showLoading(true);
          const response = await fetch(pageParseApiBase + encodeURIComponent(title));
          showLoading(false);
          if (!response.ok) throw new Error('Failed to fetch article content');
          const data = await response.json();
          if (!data.parse || !data.parse.text || !data.parse.text['*']) throw new Error('Article content not available');
          displayArticle(data);
        } catch (err) {
          showLoading(false);
          console.error(err);
          articleTitle.textContent = 'Error loading article';
          articleContent.textContent = err.message;
          resultsList.style.display = 'none';
          articleSection.hidden = false;
        }
      }

      function displayArticle(data) {
        resultsList.style.display = 'none';
        articleSection.hidden = false;
        articleTitle.textContent = data.parse.title;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = data.parse.text['*'];

        const scripts = tempDiv.querySelectorAll('script, style, link[rel="stylesheet"]');
        scripts.forEach(node => node.remove());

        const toRemoveSelectors = [
          '.mw-editsection',
          '.navbox',
          '.metadata',
          'table.ambox',
          '#toc',
          '.reference',
          '.mw-ref',
          '.mw-jump-link',
          '.printfooter'
        ];
        toRemoveSelectors.forEach(sel => {
          const elements = tempDiv.querySelectorAll(sel);
          elements.forEach(el => el.remove());
        });

        tempDiv.querySelectorAll('a').forEach(link => {
          const href = link.getAttribute('href');
          if (href && !href.startsWith('http') && !href.startsWith('#')) {
            link.setAttribute('href', 'https://en.wikipedia.org' + href);
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
          } else if (href && href.startsWith('http')) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
          }
        });

        articleContent.innerHTML = '';
        articleContent.appendChild(tempDiv);
        articleContent.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      searchForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;

        showLoading(true);
        try {
          articleSection.hidden = true;
          const response = await fetch(searchApiUrl + encodeURIComponent(query));
          if (!response.ok) throw new Error('Failed to fetch search results');
          const data = await response.json();
          showLoading(false);
          if (data?.query?.search) {
            displayResults(data.query.search);
          } else {
            displayResults([]);
          }
        } catch (err) {
          showLoading(false);
          console.error(err);
          resultsList.innerHTML = '<li>Error: ' + escapeHtml(err.message) + '</li>';
          articleSection.hidden = true;
        }
      });

      backButton.addEventListener('click', () => {
        clearArticle();
        articleSection.hidden = true;
        resultsList.style.display = 'block';
        searchInput.focus();
        window.scrollTo({ top: resultsList.offsetTop, behavior: 'smooth' });
      });
    });
