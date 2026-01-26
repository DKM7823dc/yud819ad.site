document.addEventListener('DOMContentLoaded', function() {
    const dynamicContentContainer = document.getElementById('dynamic-content');
    if (!dynamicContentContainer) {
        console.error("id dynamic-content NotFound！");
        return;
    }

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const imgSrc = isMobile ? 'static/picture/66.jpg' : 'static/picture/55.jpg';
    const imgAlt = isMobile ? 'スマホ用画像' : 'PC用画像';
    const targetURL = "https://www.qq.com";

    const htmlContent = `
        <div class="container">
            <div class="image-box">
                <img src="${imgSrc}" alt="${imgAlt}" class="carousel-img" loading="lazy">
                <div class="fallback-image" style="display:none;">画像が読み込めません</div>
            </div>

            <div class="cta-section">
                <div class="cta-container">
                    <button class="cta-button" aria-label="LINEで無料分析を申し込む">
                        AIを使って無料で解析を開始します
                    </button>
                </div>
            </div>

            <footer>
                <div class="footer-links">
                    <a href="disclaimer.html" class="footer-link">免責事項</a>
                    <a href="privacy.html" class="footer-link">個人情報保護方針</a>
                    <a href="#" class="footer-link">利用規約</a>
                </div>
            </footer>
        </div>
    `;

    dynamicContentContainer.innerHTML = htmlContent;

    const imageBox = dynamicContentContainer.querySelector('.image-box');
    const img = imageBox.querySelector('img');
    const fallback = imageBox.querySelector('.fallback-image');
    const button = dynamicContentContainer.querySelector('.cta-button');

     

    // 图片点击事件
    imageBox.addEventListener('click', openLink);
    
    // 按钮点击事件
    button.addEventListener('click', openLink);

    // 图片加载失败显示 fallback
    if (img.complete && img.naturalHeight === 0) {
        img.style.display = 'none';
        fallback.style.display = 'flex';
    }

    img.addEventListener('error', () => {
        img.style.display = 'none';
        fallback.style.display = 'flex';
    });
});
