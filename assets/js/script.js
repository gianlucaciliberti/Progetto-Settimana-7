// SportsHub — Week Project Settimana VII
//
// Devi fare 4 cose per la Versione Base:
// 1. Definire le classi Squadra ed Evento (mappano i dati di TheSportsDB)
// 2. Funzione async cercaSquadre(query) che chiama /searchteams.php
// 3. Funzione async caricaDettagli(idTeam) che chiama in parallelo
//    eventsnext.php + eventslast.php usando Promise.all
// 4. Render dinamico: card squadre, lista prossimi eventi, lista risultati
//
// Endpoint base: https://www.thesportsdb.com/api/v1/json/3/
// Il `3` nell'URL è la chiave API pubblica di test di TheSportsDB: gratis, non serve registrarsi.
//
// Per le versioni Intermedia/Avanzata: localStorage preferiti, debounce, Promise.all multi.

const form = document.getElementById("searchForm");
const input = document.getElementById("inputTeam");

const favoritesTeam = document.getElementById("favorites")
const results = document.getElementById("results");
const eventSection = document.getElementById("dettagli-section")
const events = document.getElementById("teamEvents");

const spinner = document.getElementById("spinner");
const alertBox = document.getElementById("alert");

// === Classi ===

class Squadra {

    constructor(data) {

        this.id = data.idTeam;
        this.nome = data.strTeam;
        this.logo = data.strBadge;
        this.lega = data.strLeague;
        this.paese = data.strCountry;
    }

}

class Evento {

    constructor(data) {

        this.id = data.idEvent;

        this.data = data.dateEvent;

        this.casa = data.strHomeTeam;
        this.trasferta = data.strAwayTeam;

        this.punteggioCasa = data.intHomeScore;
        this.punteggioTrasferta = data.intAwayScore;
    }

    getDataFormattata() {

        if (!this.data) return "-";

        return new Date(this.data)
            .toLocaleDateString("it-IT");
    }

    getPunteggio() {

        if (
            this.punteggioCasa === null ||
            this.punteggioCasa === undefined ||
            this.punteggioTrasferta === null ||
            this.punteggioTrasferta === undefined
        ) {
            return "vs";
        }

        return `${this.punteggioCasa} - ${this.punteggioTrasferta}`;
    }
}

// === API ===
const API_URL = "https://www.thesportsdb.com/api/v1/json/3";

const searchTeams = async (query) => {

    if (!query) return;

    results.innerHTML = "";
    eventSection.hidden = true;
    events.innerHTML = "";
    alertBox.innerHTML = "";

    spinner.classList.remove("hidden");

    try {

        const response = await fetch(
            `${API_URL}/searchteams.php?t=${encodeURIComponent(query)}`
        );

        if (!response.ok) {
            throw new Error();
        }

        const data = await response.json();

        const squadre = data.teams
            ? data.teams.map(team => new Squadra(team))
            : null;

        renderTeams(squadre);

    } catch {

        showError("Errore durante la ricerca");

    } finally {

        spinner.classList.add("hidden");
    }
};

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    searchTeams(input.value.trim());

    const query =
        input.value.trim();
});

let debounceTimer;

input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const query = input.value.trim();

    if (!query) {
        results.innerHTML = "";
        return;
    }
    debounceTimer = setTimeout(() => {
        searchTeams(query);
    }, 500);
});

async function loadTeamDetails(

    teamId, teamName
) {

    eventSection.hidden = false;

    events.innerHTML =
        `<div class="loader"></div>`;

    try {

        const [
            nextData,
            lastData
        ] = await Promise.all([
            getNextEvents(teamId),
            getLastEvents(teamId)
        ]);

        const prossimiEventi =
            nextData.events
                ? nextData.events.map(
                    event =>
                        new Evento(event)
                )
                : [];

        const ultimiEventi =
            lastData.results
                ? lastData.results.map(
                    event =>
                        new Evento(event)
                )
                : [];

        renderDetails(
            teamName,
            prossimiEventi,
            ultimiEventi
        );

    } catch (error) {

        showError(
            "Errore nel caricamento eventi"
        );

    }
}

async function getNextEvents(
    teamId
) {

    const response =
        await fetch(
            `${API_URL}/eventsnext.php?id=${teamId}`
        );

    if (!response.ok) {
        throw new Error();
    }

    return response.json();
}

async function getLastEvents(
    teamId
) {

    const response =
        await fetch(
            `${API_URL}/eventslast.php?id=${teamId}`
        );

    if (!response.ok) {
        throw new Error();
    }

    return response.json();
}

// === Render ===
function renderTeams(squadre) {

    results.innerHTML = "";

    if (!squadre) {

        results.innerHTML = `
            <p class="empty-message">
                Nessuna squadra trovata
            </p>
        `;

        return;
    }

    squadre.forEach(squadra => {

        const card =
            document.createElement("div");

        card.className = "card";
        const alreadyFavorite = isFavorite(squadra.id);

        card.innerHTML = `
            <img
                src="${squadra.logo || ""}"
                alt="${squadra.nome}"
            >

            <h3>${squadra.nome}</h3>

            <p>${squadra.lega}</p>

            <p>${squadra.paese}</p>
            <button class="favoritesBtn"
            ${alreadyFavorite ? "disabled" : ""}>
            ${alreadyFavorite ? "Aggiunto ai preferiti" : "Aggiungi ai preferiti"} 
            </button>
        `;

        const favoritesBtn = card.querySelector(".favoritesBtn");
        favoritesBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            addFavorite(squadra);
        });

        card.addEventListener(
            "click",
            () => {
                loadTeamDetails(
                    squadra.id,
                    squadra.nome
                );
            }
        );

        results.appendChild(card);
    });
}

function renderDetails(
    teamName,
    prossimiEventi,
    ultimiEventi
) {
    eventSection.hidden = false;
    events.innerHTML = `
    <h2 class="teamTitle">${teamName}</h2>
    <div class="details-container">
        <div class="events-section">
 
            <h3>
                Prossime Partite
            </h3>

            ${createEventsList(prossimiEventi)}

        </div>

        <div class="events-section">

            <h3>
                Ultimi Risultati
            </h3>

            ${createResultsList(ultimiEventi)}

        </div>

    </div>

    `;
}

function renderFavorites() {
    const favorites = getFavorites();
    favoritesTeam.innerHTML = "";
    if (!favorites.length) {
        favoritesTeam.innerHTML = `
        <p> Non hai ancora salvato nessuna squadra. Cercane una qui sopra e aggiungila ai preferiti.`;
        return
    }
    favorites.forEach(team => {
        const card = document.createElement("div");
        card.className = "favoriteCard";
        card.innerHTML = `<img src= "${team.logo}" alt = "${team.nome}">
        <h3>${team.nome}</h3>
        <p>${team.lega}</p>
        <p>${team.paese}</p>
        <button class="removeBtn">🗑️ Rimuovi</button>`;
        card.addEventListener("click", () => {
            loadTeamDetails(team.id, team.nome);
        });
        const removeBtn = card.querySelector(".removeBtn");
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeFavorite(team.id);
        });

        favoritesTeam.appendChild(card);
    });
}


// === Eventi ===
function createEventsList(
    eventi
) {

    if (!eventi.length) {

        return `
            <p>
                Nessun evento disponibile
            </p>
        `;
    }

    return `
        <ul>

            ${eventi.map(evento => `

                <li>

                    <p>
                        ${evento.getDataFormattata()}
                    </p>

                    <br>

                    ${evento.casa}

                    vs

                    ${evento.trasferta}

                </li>

            `).join("")}

        </ul>
    `;
}

function createResultsList(
    eventi
) {

    if (!eventi.length) {

        return `
            <p>
                Nessun risultato disponibile
            </p>
        `;
    }

    return `
        <ul>

            ${eventi.map(evento => `

                <li>

                    <p>
                        ${evento.getDataFormattata()}
                    </p>

                    <br>

                    <div class="matchRow">
                       <span>
                           ${evento.casa}
                           vs
                           ${evento.trasferta}
                        </span>
                        
                        <span class="scoreBadge">
                            ${evento.getPunteggio()}
                        </span>
                        </div>

                </li>

            `).join("")}

        </ul>
    `;
}

function showError(
    message
) {

    alertBox.innerHTML = `

        <div class="error">

            ${message}

        </div>

    `;
}


// ===STORAGE===
const STORAGE_KEY = "sportshub-favorites";

const getFavorites = () => {
    return JSON.parse(
        localStorage.getItem(STORAGE_KEY)
    ) || [];
};

const saveFavorites = (favorites) => {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(favorites)
    );
};

const addFavorite = (squadra) => {
    const favorites = getFavorites();

    const exists = favorites.some(fav => fav.id === squadra.id);

    if (exists) return;
    favorites.push(squadra);
    saveFavorites(favorites);
    renderFavorites();
}

const removeFavorite = (teamId) => {
    const favorites = getFavorites().filter(
        fav => fav.id !== teamId
    );
    saveFavorites(favorites);
    renderFavorites();
};

const isFavorite = (teamId) => {
    return getFavorites().some(
        fav => fav.id === teamId
    );
};
renderFavorites();



