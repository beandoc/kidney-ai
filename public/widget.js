/**
 * Kidney-AI Chat Widget Script
 * ----------------------------
 * Include this on your website to display a floating chat bubble.
 * Usage: <script src="https://YOUR-CHAT-URL/widget.js" data-label="Chat with Dr. Sachin"></script>
 */

(function() {
    const script = document.currentScript;
    const label = (script && script.getAttribute('data-label')) || 'Chat with Dr. Sachin';
    const chatUrl = script ? script.src.replace('/widget.js', '') : window.location.origin;

    // Create Styles
    const style = document.createElement('style');
    style.textContent = `
        .kidney-chat-bubble {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background: #128C7E;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            cursor: pointer;
            z-index: 999998;
            transition: transform 0.3s ease;
        }
        .kidney-chat-bubble:hover { transform: scale(1.1); }
        .kidney-chat-bubble svg { width: 30px; height: 30px; fill: white; }
        
        .kidney-chat-container {
            position: fixed;
            bottom: 90px;
            right: 20px;
            width: 400px;
            height: 650px;
            max-width: calc(100vw - 40px);
            max-height: calc(100vh - 120px);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 12px 40px rgba(0,0,0,0.2);
            z-index: 999999;
            background: white;
            display: none;
            flex-direction: column;
            border: 1px solid #e0e0e0;
        }
        .kidney-chat-container.open { display: flex; }
        .kidney-chat-container iframe { width: 100%; height: 100%; border: none; }
        
        @media (max-width: 480px) {
            .kidney-chat-container {
                bottom: 0; right: 0; width: 100vw; height: 100vh; max-width: 100vw; max-height: 100vh; border-radius: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Create Bubble
    const bubble = document.createElement('div');
    bubble.className = 'kidney-chat-bubble';
    bubble.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20,2H4C2.9,2,2,2.9,2,4v18l4-4h14c1.1,0,2-0.9,2-2V4C22,2.9,21.1,2,20,2z M20,16H5.2L4,17.2V4h16V16z"/></svg>`;
    document.body.appendChild(bubble);

    // Create Container
    const container = document.createElement('div');
    container.className = 'kidney-chat-container';
    container.innerHTML = `<iframe src="${chatUrl}"></iframe>`;
    document.body.appendChild(container);

    // Toggle Logic
    bubble.onclick = () => {
        container.classList.toggle('open');
    };
})();
