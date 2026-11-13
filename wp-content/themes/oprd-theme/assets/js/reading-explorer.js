(function () {
    'use strict';

    const MAX_QUESTION_CHARACTERS = 250;
    const QUESTION_STORAGE_KEY = 'oprdReadingExplorerQuestion';
    const TOPICS = [
        {
            id: 'love',
            label: 'Love and relationships',
            url: '/love-readings/',
            keywords: ['love', 'relationship', 'relationships', 'dating', 'date', 'breakup', 'break up', 'partner', 'marriage', 'romance', 'ex']
        },
        {
            id: 'career',
            label: 'Career and work',
            url: '/career/',
            keywords: ['career', 'job', 'work', 'promotion', 'boss', 'business', 'colleague', 'profession']
        },
        {
            id: 'tarot',
            label: 'Tarot readings',
            url: '/tarot-readings/',
            keywords: ['tarot', 'card', 'cards', 'spread']
        },
        {
            id: 'astrology',
            label: 'Astrology',
            url: '/astrology/',
            keywords: ['astrology', 'astrologer', 'zodiac', 'horoscope', 'birth chart', 'star sign', 'planet']
        },
        {
            id: 'dream',
            label: 'Dream interpretation',
            url: '/dream/',
            keywords: ['dream', 'dreams', 'sleep', 'nightmare']
        },
        {
            id: 'life',
            label: 'Life path and direction',
            url: '/life-path/',
            keywords: ['life', 'future', 'purpose', 'direction', 'decision', 'choice', 'change', 'path']
        }
    ];

    const TOPIC_ALIASES = {
        love: ['love', 'relationship', 'relationships'],
        career: ['career', 'work', 'job'],
        tarot: ['tarot', 'card', 'cards'],
        astrology: ['astrology', 'zodiac', 'horoscope'],
        dream: ['dream', 'dreams'],
        life: ['life', 'life-path', 'direction']
    };

    function countCharacters(value) {
        return Array.from(value).length;
    }

    function truncateQuestion(value) {
        return Array.from(value).slice(0, MAX_QUESTION_CHARACTERS).join('');
    }

    function normalizeTopic(value) {
        const normalized = String(value || '').toLowerCase().trim().replace(/[_\s]+/g, '-');

        for (const topicId of Object.keys(TOPIC_ALIASES)) {
            if (TOPIC_ALIASES[topicId].some(function (alias) {
                return normalized === alias || normalized.startsWith(alias + '-') || normalized.endsWith('-' + alias);
            })) {
                return topicId;
            }
        }

        return normalized;
    }

    function createResultsRegion(button) {
        let region = document.querySelector('[data-oprd-reading-explorer-results]');
        if (region) {
            return region;
        }

        region = document.createElement('div');
        region.className = 'oprd-reading-explorer-results';
        region.setAttribute('data-oprd-reading-explorer-results', '');
        region.setAttribute('role', 'status');
        region.setAttribute('aria-live', 'polite');
        region.setAttribute('aria-atomic', 'true');
        button.insertAdjacentElement('afterend', region);
        return region;
    }

    function showRecommendations(region, topics, message) {
        region.replaceChildren();

        const description = document.createElement('p');
        description.textContent = message;
        region.appendChild(description);

        const list = document.createElement('ul');
        topics.forEach(function (topic) {
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.href = topic.url;
            link.textContent = topic.label;
            item.appendChild(link);
            list.appendChild(item);
        });
        region.appendChild(list);
    }

    function scoreTopic(topic, normalizedQuestion) {
        return topic.keywords.reduce(function (score, keyword) {
            const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const expression = new RegExp('(^|[^a-z0-9])' + escapedKeyword + '([^a-z0-9]|$)', 'g');
            const matches = normalizedQuestion.match(expression);
            return score + (matches ? matches.length : 0);
        }, 0);
    }

    function initQuestionExplorer() {
        const input = document.querySelector('#oprd-question-input');
        const submitButton = document.querySelector('#oprd-question-submit');
        const counter = document.querySelector('#oprd-question-count');

        if (!input || !submitButton) {
            return;
        }

        // Ліміт рахує символи Unicode; атрибут обмежує обсяг UTF-16 у браузері.
        input.maxLength = MAX_QUESTION_CHARACTERS * 2;

        const updateCounter = function () {
            const limitedValue = truncateQuestion(input.value);
            if (input.value !== limitedValue) {
                input.value = limitedValue;
            }
            if (counter) {
                counter.textContent = countCharacters(input.value) + '/' + MAX_QUESTION_CHARACTERS;
            }
            input.removeAttribute('aria-invalid');
        };

        input.addEventListener('input', updateCounter);
        updateCounter();

        const handleSubmit = function (event) {
            if (event) {
                event.preventDefault();
            }

            const question = truncateQuestion(input.value).trim();
            const results = createResultsRegion(submitButton);

            if (!question) {
                input.setAttribute('aria-invalid', 'true');
                results.textContent = 'Please enter a question to see related reading topics.';
                input.focus();
                return;
            }

            const scoredTopics = TOPICS.map(function (topic) {
                return { topic: topic, score: scoreTopic(topic, question.toLowerCase()) };
            }).filter(function (entry) {
                return entry.score > 0;
            }).sort(function (first, second) {
                return second.score - first.score;
            });

            try {
                window.sessionStorage.setItem(QUESTION_STORAGE_KEY, question);
            } catch (error) {
                // Якщо sessionStorage недоступне, лишаємо вибір у безпечних локальних посиланнях.
                showRecommendations(results, scoredTopics.length ? [scoredTopics[0].topic] : TOPICS, 'Choose a reading topic related to your question.');
                return;
            }

            if (scoredTopics.length) {
                window.location.assign(scoredTopics[0].topic.url);
                return;
            }

            showRecommendations(results, TOPICS, 'Choose the topic that best fits your question.');
        };

        const form = submitButton.closest('form');
        if (form) {
            form.addEventListener('submit', handleSubmit);
        }
        submitButton.addEventListener('click', function (event) {
            if (!form || submitButton.type !== 'submit') {
                handleSubmit(event);
            }
        });

        input.addEventListener('keydown', function (event) {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                handleSubmit(event);
            }
        });
    }

    function initTopicFilters() {
        const filterButtons = Array.from(document.querySelectorAll('[data-topic-filter]'));
        const cards = Array.from(document.querySelectorAll('.oprd-topic-card[data-topic]'));

        if (!filterButtons.length || !cards.length) {
            return;
        }

        let activeFilter = 'all';
        let status = document.querySelector('[data-oprd-topic-filter-status]');
        if (!status) {
            status = document.createElement('p');
            status.className = 'screen-reader-text';
            status.setAttribute('data-oprd-topic-filter-status', '');
            status.setAttribute('role', 'status');
            status.setAttribute('aria-live', 'polite');
            filterButtons[filterButtons.length - 1].insertAdjacentElement('afterend', status);
        }

        const applyFilter = function () {
            let visibleCount = 0;
            cards.forEach(function (card) {
                const cardTopics = card.dataset.topic.split(/[\s,|]+/).map(normalizeTopic);
                const isVisible = activeFilter === 'all' || cardTopics.includes(activeFilter);
                card.hidden = !isVisible;
                if (isVisible) {
                    visibleCount += 1;
                }
            });
            status.textContent = 'Showing ' + visibleCount + ' topic ' + (visibleCount === 1 ? 'card.' : 'cards.');
        };

        filterButtons.forEach(function (button) {
            button.setAttribute('aria-pressed', normalizeTopic(button.dataset.topicFilter) === activeFilter ? 'true' : 'false');
            button.addEventListener('click', function () {
                const requestedFilter = normalizeTopic(button.dataset.topicFilter);
                activeFilter = requestedFilter === 'all' ? 'all' : requestedFilter;
                filterButtons.forEach(function (filterButton) {
                    filterButton.setAttribute('aria-pressed', normalizeTopic(filterButton.dataset.topicFilter) === activeFilter ? 'true' : 'false');
                });
                applyFilter();
            });
        });

        applyFilter();
    }

    function init() {
        initQuestionExplorer();
        initTopicFilters();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
}());
