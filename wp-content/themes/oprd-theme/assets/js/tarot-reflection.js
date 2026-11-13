(function () {
    'use strict';

    const CARDS = [
        {
            name: 'The Fool',
            prompt: 'What small beginning are you curious enough to explore?'
        },
        {
            name: 'The Star',
            prompt: 'What quiet source of hope can you make room for today?'
        },
        {
            name: 'The Hermit',
            prompt: 'What might become clearer if you give yourself space to think?'
        },
        {
            name: 'The Sun',
            prompt: 'What feels energizing and honest in your life right now?'
        },
        {
            name: 'Justice',
            prompt: 'Which facts and values would help you weigh this choice fairly?'
        },
        {
            name: 'Temperance',
            prompt: 'Where could a steadier pace help you find balance?'
        }
    ];

    function prepareResultRegion(result) {
        result.setAttribute('aria-live', 'polite');
        result.setAttribute('aria-atomic', 'true');
        if (!result.hasAttribute('role')) {
            result.setAttribute('role', 'status');
        }
    }

    function showCard(result, card) {
        const heading = document.createElement('h3');
        heading.textContent = card.name;

        const prompt = document.createElement('p');
        prompt.textContent = card.prompt;

        const disclaimer = document.createElement('p');
        disclaimer.textContent = 'For reflection, not a prediction.';

        result.replaceChildren(heading, prompt, disclaimer);
        result.hidden = false;
    }

    function init() {
        const buttons = document.querySelectorAll('[data-tarot-draw]');

        buttons.forEach(function (button) {
            const widget = button.closest('[data-tarot-widget]');
            const result = (widget && widget.querySelector('[data-tarot-result]')) ||
                document.querySelector('[data-tarot-result]');

            if (!result) {
                return;
            }

            prepareResultRegion(result);
            button.addEventListener('click', function () {
                const card = CARDS[Math.floor(Math.random() * CARDS.length)];
                showCard(result, card);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
}());
