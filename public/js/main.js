const bookmarkBtn = document.getElementById('bookmark-btn');
if (bookmarkBtn) {
  bookmarkBtn.addEventListener('click', async () => {
    const novelId    = bookmarkBtn.dataset.novelId;
    const isMarked   = bookmarkBtn.dataset.bookmarked === 'true';
    bookmarkBtn.disabled = true;

    try {
      const res  = await fetch('/bookmarks/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novelId }),
      });
      const data = await res.json();
      if (data.bookmarked !== undefined) {
        bookmarkBtn.dataset.bookmarked = data.bookmarked;
        bookmarkBtn.textContent = data.bookmarked ? '★ Saved' : '☆ Save';
        bookmarkBtn.classList.toggle('btn--primary', data.bookmarked);
        bookmarkBtn.classList.toggle('btn--ghost',   !data.bookmarked);
      }
    } catch (err) {
      console.error('Bookmark error:', err);
    } finally {
      bookmarkBtn.disabled = false;
    }
  });
}

document.querySelectorAll('.flash').forEach((el) => {
  setTimeout(() => {
    el.style.transition = 'opacity 0.5s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 500);
  }, 3500);
});

document.querySelectorAll('[data-confirm]').forEach((el) => {
  el.addEventListener('click', (e) => {
    if (!confirm(el.dataset.confirm)) e.preventDefault();
  });
});
