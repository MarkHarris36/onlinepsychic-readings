(function () {
    'use strict';

    const MAX_ENTRY_CHARACTERS = 1000;
    const STORAGE_KEY = 'oprdDreamJournalEntriesV1';

    function countCharacters(value) {
        return Array.from(value).length;
    }

    function limitCharacters(value) {
        return Array.from(value).slice(0, MAX_ENTRY_CHARACTERS).join('');
    }

    function readEntries() {
        try {
            const storedValue = window.localStorage.getItem(STORAGE_KEY);
            if (!storedValue) {
                return { entries: [], error: false };
            }

            const parsedValue = JSON.parse(storedValue);
            if (!Array.isArray(parsedValue)) {
                return { entries: [], error: true };
            }

            const entries = parsedValue.filter(function (entry) {
                return entry && typeof entry.text === 'string' && typeof entry.createdAt === 'string';
            }).map(function (entry) {
                return {
                    text: limitCharacters(entry.text),
                    createdAt: entry.createdAt
                };
            }).filter(function (entry) {
                return entry.text.trim() !== '' && Number.isFinite(Date.parse(entry.createdAt));
            });

            return { entries: entries, error: false };
        } catch (error) {
            return { entries: [], error: true };
        }
    }

    function writeEntries(entries) {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
            return true;
        } catch (error) {
            return false;
        }
    }

    function formatDate(dateValue) {
        return new Intl.DateTimeFormat('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(new Date(dateValue));
    }

    function initJournal(journal) {
        const entryField = journal.querySelector('[data-dream-entry]');
        const saveButton = journal.querySelector('[data-dream-save]');
        const entryList = journal.querySelector('[data-dream-list]');
        const clearButton = journal.querySelector('[data-dream-clear]');
        const status = journal.querySelector('[data-dream-status]');

        if (!entryField || !saveButton || !entryList || !clearButton || !status) {
            return;
        }

        // Атрибут обмежує обсяг UTF-16, обробник нижче лімітує Unicode-символи.
        entryField.maxLength = MAX_ENTRY_CHARACTERS * 2;
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        status.setAttribute('aria-atomic', 'true');

        function setStatus(message) {
            status.textContent = message;
        }

        function renderEntries(entries) {
            entryList.replaceChildren();

            entries.forEach(function (entry) {
                const item = document.createElement('li');
                const date = document.createElement('time');
                const text = document.createElement('p');

                date.dateTime = entry.createdAt;
                date.textContent = formatDate(entry.createdAt);
                text.textContent = entry.text;
                item.appendChild(date);
                item.appendChild(text);
                entryList.appendChild(item);
            });
        }

        function refreshEntries() {
            const result = readEntries();
            renderEntries(result.entries);
            if (result.error) {
                setStatus('Saved dreams could not be read from this browser.');
            }
            return result;
        }

        function saveEntry(event) {
            if (event) {
                event.preventDefault();
            }

            const limitedText = limitCharacters(entryField.value);
            if (entryField.value !== limitedText) {
                entryField.value = limitedText;
            }

            const text = limitedText.trim();
            if (!text) {
                setStatus('Write a dream before saving it.');
                entryField.focus();
                return;
            }

            const current = readEntries();
            if (current.error) {
                setStatus('Saved dreams could not be read. Your entry was not saved.');
                return;
            }

            const entries = [{ text: text, createdAt: new Date().toISOString() }].concat(current.entries);
            if (!writeEntries(entries)) {
                setStatus('This browser could not save your dream. Check its storage settings and try again.');
                return;
            }

            entryField.value = '';
            renderEntries(entries);
            setStatus('Dream saved on this device.');
        }

        function clearEntries(event) {
            if (event) {
                event.preventDefault();
            }

            const current = readEntries();
            if (current.error) {
                setStatus('Saved dreams could not be read from this browser.');
                return;
            }
            if (!current.entries.length) {
                setStatus('There are no saved dreams to clear.');
                return;
            }

            if (!window.confirm('Delete all saved dreams from this browser? This cannot be undone.')) {
                setStatus('Saved dreams were kept.');
                return;
            }

            if (!writeEntries([])) {
                setStatus('This browser could not clear your saved dreams. Try again.');
                return;
            }

            renderEntries([]);
            setStatus('All saved dreams were deleted from this device.');
        }

        entryField.addEventListener('input', function () {
            const limitedText = limitCharacters(entryField.value);
            if (entryField.value !== limitedText) {
                entryField.value = limitedText;
                setStatus('Dream entries can contain up to 1,000 characters.');
            }
        });

        entryField.addEventListener('keydown', function (event) {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                saveEntry(event);
            }
        });

        saveButton.addEventListener('click', saveEntry);
        clearButton.addEventListener('click', clearEntries);

        const initial = refreshEntries();
        if (!initial.error) {
            setStatus('Dream journal ready. Entries are saved only in this browser.');
        }

        // Синхронізувати список, якщо користувач змінить щоденник в іншій вкладці.
        window.addEventListener('storage', function (event) {
            if (event.key === STORAGE_KEY || event.key === null) {
                refreshEntries();
            }
        });
    }

    function init() {
        document.querySelectorAll('[data-oprd-dream-journal]').forEach(initJournal);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
}());
