const apiUrl = 'https://api.coingecko.com/api/v3';
let debounceTimeout;

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(searchCryptos, 300));
    }

    if (window.location.pathname.endsWith('index.html')) {
        fetchCryptos();
    } else if (window.location.pathname.endsWith('favorites.html')) {
        fetchFavorites();
    } else if (window.location.pathname.endsWith('coins.html')) {
        fetchCoinDetails();
    }
});

function debounce(func, delay) {
    return function(...args) {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => func.apply(this, args), delay);
    };
}

function showLoading() {
    return `<div class="loading">Loading.....Please Wait</div>`;
}

async function fetchCryptos(page = 1, query = '') {
    const cryptoList = document.getElementById('crypto-list');
    if (cryptoList) cryptoList.innerHTML = showLoading();

    const response = await fetch(`${apiUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=${page}&sparkline=false`);
    const data = await response.json();

    if (cryptoList) cryptoList.innerHTML = data.map(coin => `
        <div class="crypto-item" onclick="viewCoinDetails('${coin.id}')">
            <img src="${coin.image}" alt="${coin.name}" width="20">
            ${coin.name} (${coin.symbol.toUpperCase()}) - $${coin.current_price}
            <button onclick="addToFavorites('${coin.id}', event)">Add to Favorites</button>
        </div>
    `).join('');
}

async function searchCryptos() {
    const query = document.getElementById('search-input').value;
    fetchCryptos(1, query);
}

function viewCoinDetails(coinId) {
    window.location.href = `coins.html?id=${coinId}`;
}

function addToFavorites(coinId, event) {
    event.stopPropagation();
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    if (!favorites.includes(coinId)) {
        favorites.push(coinId);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        alert('Added to favorites');
    } else {
        alert('Already in favorites');
    }
}

function removeFromFavorites(coinId, event) {
    event.stopPropagation();
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    favorites = favorites.filter(id => id !== coinId);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    fetchFavorites();
}

async function fetchFavorites() {
    const favoriteList = document.getElementById('favorite-list');
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    if (favoriteList) favoriteList.innerHTML = showLoading();

    const promises = favorites.map(id => fetch(`${apiUrl}/coins/markets?vs_currency=usd&ids=${id}`).then(response => response.json()));
    const results = await Promise.all(promises);

    if (favoriteList) favoriteList.innerHTML = results.flat().map(coin => `
        <div class="crypto-item" onclick="viewCoinDetails('${coin.id}')">
            <img src="${coin.image}" alt="${coin.name}" width="20">
            ${coin.name} (${coin.symbol.toUpperCase()}) - $${coin.current_price}
            <button onclick="removeFromFavorites('${coin.id}', event)">Remove from Favorites</button>
        </div>
    `).join('');
}

async function fetchCoinDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const coinId = urlParams.get('id');
    const coinDetails = document.getElementById('coin-details');
    if (coinDetails) coinDetails.innerHTML = showLoading();

    const response = await fetch(`${apiUrl}/coins/${coinId}`);
    const data = await response.json();

    const responseHistory = await fetch(`${apiUrl}/coins/${coinId}/market_chart?vs_currency=usd&days=30`);
    const history = await responseHistory.json();

    const labels = history.prices.map(price => new Date(price[0]).toLocaleDateString());
    const prices = history.prices.map(price => price[1]);

    if (coinDetails) coinDetails.innerHTML = `
        <img src="${data.image.large}" alt="${data.name}" width="50">
        <h2>${data.name} (${data.symbol.toUpperCase()})</h2>
        <p>Rank: ${data.market_cap_rank}</p>
        <p>Current Price: $${data.market_data.current_price.usd}</p>
        <p>Market Cap: $${data.market_data.market_cap.usd}</p>
        <canvas id="price-chart"></canvas>
    `;

    const ctx = document.getElementById('price-chart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Price (USD)',
                data: prices,
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    }
                }
            }
        }
    });
}
