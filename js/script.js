'use strict';

const searchRequestUrl = 'https://api.github.com/search/repositories';
const REPOSITORIES_COUNT_LIMIT = 10;

const formErrors = new Map();
formErrors.set('request-small', 'Введите хотя бы два непробельных символа');

const exclusiveClassNamesOfList = {
    success: 'search-results__items',
    empty: 'search-results__empty',
    error: 'search-results__error'
};

const searchForm = document.querySelector('#search-form');
const searchRequestInput = searchForm.elements.search_text;
const searchRequestButton = searchForm.elements.search_button;


const searchListElem = document.querySelector('#search-results');
searchListElem.innerHTML = '<div></div>';

const searchListIsEmptyHTML = 'Ничего не найдено';

searchForm.addEventListener('submit', (event) => {
    event.preventDefault();

    processSearchForm();
});

searchForm.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();

        processSearchForm();
    }
});

function processSearchForm() {

    lockSearchForm();

    let searchRequestStr = searchRequestInput.value.trim();

    if (processCondition(searchRequestStr.replace(/\s+/, '').length < 2, 'request-small', searchRequestInput) && !unlockSearchForm()) {
        return;
    }

    makeRequest(searchRequestUrl, searchRequestStr, unlockSearchForm);
}

function delayAsyncCall(func, timeout) {
    return function () {
        return setTimeout(func, timeout);
    }
}

function lockSearchForm() {
    setLockSearchForm(true);
}

function unlockSearchForm() {
    setLockSearchForm(false);
}

function setLockSearchForm(lock) {
    searchRequestButton.disabled = searchRequestInput.disabled = lock;
}

function makeRequest(requestUrl, requestStr, finallyFunc) {
    const queryString = requestUrl + '?q=' + encodeURIComponent(requestStr + ' in:name') + '&per_page=' + REPOSITORIES_COUNT_LIMIT;

    fetch(queryString, {
        headers: {
            Accept: 'application/vnd.github+json'
        }
    }).then(response => response.json())
        .then(processSuccessResponse)
        .catch(processErrorResponse)
        .finally(finallyFunc);
}

function processSuccessResponse(jsonObj) {
    if (jsonObj.items) {
        if (jsonObj.items.length > 0) {

            const container = getSearchListImmediateContainerIfNeeded(searchListElem);

            setStateToResultContainer(container, exclusiveClassNamesOfList, 'success');

            container.innerHTML = ``;

            const wrapper = new DocumentFragment();

            for (let i = 0; i < jsonObj.items.length; i++) {
                const itemObj = jsonObj.items[i];

                const resultFields = {
                    url: itemObj?.html_url,
                    name: itemObj?.name,
                    ownerLogin: itemObj?.owner?.login,
                    description: itemObj?.description
                };

                const itemElement = createSearchResultItem(resultFields);

                wrapper.append(itemElement);
            }

            container.append(wrapper);
        }
        else {
            processEmptyResponse();
        }
    }
}

function processEmptyResponse() {
    const container = getSearchListImmediateContainerIfNeeded(searchListElem);

    setStateToResultContainer(container, exclusiveClassNamesOfList, 'empty');

    container.innerHTML = `По вашему запросу ничего не найдено`;
}

function processErrorResponse(error) {
    const container = getSearchListImmediateContainerIfNeeded(searchListElem);

    setStateToResultContainer(container, exclusiveClassNamesOfList, 'error');

    container.innerHTML = `Во время выполнения запроса произошла ошибка: ${error.message}`;
}

function setStateToResultContainer(container, exclusiveClassNames, state) {
    container = getSearchListImmediateContainerIfNeeded(container);

    const neededClassName = exclusiveClassNames[state];

    if (!container.classList.contains(neededClassName)) {
        for (const stateName in exclusiveClassNames) {
            container.classList.remove(exclusiveClassNames[stateName]);
        }

        container.classList.add(neededClassName);
    }
}

function processCondition(condition, errorCode, inputElem) {
    if (condition) {
        const notify = showNotify(inputElem, formErrors.has(errorCode) ? formErrors.get(errorCode) : 'Ошибка!');
        inputElem.addEventListener(inputIsTyping(inputElem) ? 'input' : 'change', () => {
            notify.remove();
        }, { once: true });

        inputElem.focus();

        return true;
    }

    return false;
}

function inputIsTyping(inputElem) {
    return inputElem.type === 'text' ||
        inputElem.tagName.toLowerCase() === 'textarea';
}

function showNotify(elem, htmlText) {
    const notify = document.createElement('div');
    notify.style.position = 'absolute';
    notify.className = 'field-error-notify';
    notify.innerHTML = htmlText;

    const coordsBox = getCoordsBox(elem);
    notify.style.left = coordsBox.left + 'px';
    notify.style.top = coordsBox.bottom + 5 + 'px';

    document.body.append(notify);

    return notify;
}

function getCoordsBox(elem) {
    const elemRect = elem.getBoundingClientRect();

    return {
        left: elemRect.left + window.pageXOffset,
        top: elemRect.top + window.pageYOffset,
        right: elemRect.right + window.pageXOffset,
        bottom: elemRect.bottom + window.pageYOffset
    }
}

function createSearchResultItem(fields) {

    const searchResultElem = document.createElement('div');

    searchResultElem.classList.add('search-results__item', 'search-results-item');

    let htmlStr = `<div class="search-results-item__field search-results-item__name">
                                    <span class="search-results-item__title">Название репозитория: </span>`
        +
        (fields.url ? `<a target="_blank" class="search-results-item__link" href="${fields.url}">` : ``)
        +
        `${fields.name ? fields.name : '&lt;Без имени&gt;'}`
        +
        (fields.url ? `</a>` : ``)
        +
        `</div>
                                  <div class="search-results-item__field search-results-item__owner">
                                    <span class="search-results-item__title">Логин владельца: </span>
                                    ${fields.ownerLogin ? fields.ownerLogin : '&lt;Без логина&gt;'}
                                  </div>
                                  <div class="search-results-item__field search-results-item__description">
                                    <span class="search-results-item__title">Описание репозитория: </span>
                                    <div class="search-results-item__description-text">${fields.description ? fields.description : '&lt;Без описания&gt;'}</div>
                                  </div>`;

    searchResultElem.innerHTML = htmlStr;

    return searchResultElem;
}

function getSearchListImmediateContainerIfNeeded(searchListContainer) {
    return searchListContainer.classList.contains('search-results') ? searchListContainer.firstElementChild : searchListContainer;
}
