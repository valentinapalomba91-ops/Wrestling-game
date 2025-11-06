import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';

// --- DEFINIZIONI PER L'AMBIENTE ES MODULE ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 
// --------------------------------------------

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// MODIFICA CRITICA PER RENDER: Usa la porta di ambiente fornita o 3000
const PORT = process.env.PORT || 3000;

// ==========================================================
// 🎲 LOGICA DI GIOCO (SERVER-AUTHORITATIVE)
// ==========================================================

const TOTAL_CELLS = 100;
const CARD_DRAW_CELLS = [
    5, 12, 18, 24, 31, 38, 44, 52, 59, 66, 73, 79, 84, 91, 98 
];
const PLAYER_SYMBOLS = ["⭐", "👑", "🐍", "🔥", "💪", "👊"];

// ==========================================================
// 🃏 DEFINIZIONE DELLE CARTE SPECIALI (25 Carte)
// ... (omesse per brevità, sono le stesse)
// ==========================================================
const CARDS = [
    // 1. 🟢 Carte Bonus e Avanzamento (3 Carte)
    { 
        name: "Figure Four Leglock! WOOO!", 
        text: "Diventi parte della famiglia Flair e apprendi di diritto la Figure Four.", 
        type: 'bonus', 
        effect_desc: "Avanzi di 2 caselle.", 
        move_steps: 2 
    },
    { 
        name: "Spear from Nowhere!", 
        text: "Roman Reigns ed Edge ti insegnano a fare una spear spettacolare!", 
        type: 'bonus', 
        effect_desc: "Avanzi di 5 caselle.", 
        move_steps: 5 
    },
    { 
        name: "Take your vitamins!", 
        text: "Ascolti Hulk Hogan, preghi e prendi le tue vitamine (VITAMINE EH!)", 
        type: 'bonus', 
        effect_desc: "Avanza della distanza pari al tuo ultimo lancio del dado moltiplicato per tre. (Se hai tirato 6, avanzi di 18!)", 
        move_multiplier: 3 
    },

    // 2. 🟠 Carte di Movimento Speciale e Targettizzato (3 Carte)
    { 
        name: "Mami is always on top!", 
        text: "Rhea Ripley ti prende sotto la sua ala e ti aiuta con una Riptide! Ora sei un/una bimbo/bimba di Rhea!", 
        type: 'special', 
        effect_desc: "Avanzi di 4 caselle.", 
        move_steps: 4 
    },
    { 
        name: "One Final Time! FU (AAA me fa schifo) di Cena!", 
        text: "Johnny Boy ti aiuta un'ultima volta.", 
        type: 'special', 
        effect_desc: "Avanzi di 1 casella.", 
        move_steps: 1 
    },
    { 
        name: "Pipe Bomb! L'anima di Cm Punk si reincarna in te.", 
        text: "Fai un promo della madonna (messa solo per par condicio).", 
        type: 'special', 
        effect_desc: "Il giocatore più avanti retrocede alla tua casella attuale.", 
        target_nearest_ahead_back_to_self: true 
    },

    // 3. 🔴 Carte Malus e Retrocessione (6 Carte)
    { 
        name: "BOTCHONE!", 
        text: "Sin Cara si impossessa di te e Botchi qualsiasi cosa.", 
        type: 'malus', 
        effect_desc: "Retrocedi di 3 caselle.", 
        move_steps: -3 
    },
    { 
        name: "Il Judgment Day esiste ancora!", 
        text: "JD doveva esplodere mille anni fa, ma è ancora qui e nessuno sa perchè. In ogni caso decide di interferire nel tuo match a tuo sfavore.", 
        type: 'malus', 
        effect_desc: "Retrocedi di 2 caselle.", 
        move_steps: -2 
    },
    { 
        name: "Burn it Down!", 
        text: "Durante il tuo match parte la theme di Seth Rollins, che appare sullo stage vestito come una guardia svizzera che, in un moto di pazzia, ha tinto i vestiti di giallo, verde, arancione e viola fluo. Sopra indossa una tenda da doccia rossa con le paperelle e gli occhiali più grandi della sua faccia. Ride. Ti distrai, anzi, probabilmente ti accechi.", 
        type: 'malus', 
        effect_desc: "Retrocedi di 1 casella.", 
        move_steps: -1 
    },
    { 
        name: "Cody inizia a ringraziare tutti!", 
        text: "Cody vince la coppa del nonno, fa un promo dove nomina tutta la sua famiglia e inizia a ringraziare chiunque.", 
        type: 'malus', 
        effect_desc: "Retrocedi di 2 caselle.", 
        move_steps: -2 
    },
    { 
        name: "Non capisci cosa dica Jey Uso!", 
        text: "YEET! Jey ti dice cosa fare, ma tu capisci solo Yeet e un paio di Uce. Nel dubbio tu Yeetti e va male.", 
        type: 'malus', 
        effect_desc: "Retrocedi di 1 casella.", 
        move_steps: -1 
    },
    { 
        name: "Il cameraman inquadra Stephanie Vaquer, Booker T impazzisce!", 
        text: "Non capisci più una mazza fra la Vaquer e Booker T che sbraita e scivoli sulla tua stessa bava.", 
        type: 'malus', 
        effect_desc: "Retrocedi di 1 casella.", 
        move_steps: -1 
    },

    // 4. 🟣 Carte di Controllo di Massa e Turni (13 Carte)
    { 
        name: "Swanton Bomb!", 
        text: "La creatrice del gioco vede una Swanton fatta da Jeff Hardy, si mette a piangere ed immersa nella tristezza fa avanzare tutti di tre caselle.", 
        type: 'bonus', 
        effect_desc: "Tutti i giocatori avanzano di 3 caselle.", 
        move_all: 3 
    },
    { 
        name: "Claymore!", 
        text: "Drew McIntyre intercede per te e colpisce tutti con una Claymore!", 
        type: 'bonus', 
        effect_desc: "Avanzi di 3 caselle.", 
        move_steps: 3 
    },
    { 
        name: "Vince returns!", 
        text: "Vince McMahon ritorna, distrugge tutti i piani di Triple H e ripristina la sua egemonia. No chance in hell!", 
        type: 'malus', 
        effect_desc: "Tutti i giocatori tornano alla casella 1.", 
        move_all_to_start: true 
    },
    { 
        name: "Underdog from the Underground!", 
        text: "Sami Zayne è una brava persona che aiuta sempre il più svantaggiato. E poi è simpatico. Ucey.", 
        type: 'special', 
        effect_desc: "Il giocatore più indietro avanza alla tua casella, tutti gli altri saltano un turno.", 
        target_farthest_backward_to_self: true, 
        skip_all_others: true 
    },
    { 
        name: "Samoan dynasty!", 
        text: "Il risultato di un test del DNA svolto da Rikishi mostra che tutti i giocatori sono samoani...", 
        type: 'bonus', 
        effect_desc: "Tutti i giocatori avanzano di 2 caselle.", 
        move_all: 2 
    },
    { 
        name: "Stunner! Stunner! Stunner!", 
        text: "Stone Cold Steve Austin colpisce tutti con una Stunner e poi si sbrodola birra addosso. Forse era ubriaco.", 
        type: 'malus', 
        effect_desc: "Tutti i giocatori retrocedono di 2 caselle.", 
        move_all: -2 
    },
    { 
        name: "Ref Bump!", 
        text: "Hey, la WWE ne piazza uno ogni due match, perchè io non dovrei metterlo?", 
        type: 'malus', 
        effect_desc: "Salterai il prossimo turno.", 
        skip_next_turn: true 
    },
    { 
        name: "Double Count-Out!", 
        text: "Tu e il giocatore più avanti vi fermate dal paninaro mentre lottatate fuori dal ring.", 
        type: 'malus', 
        effect_desc: "Tu e il giocatore più avanti salterete il prossimo turno.", 
        skip_self_and_farthest_ahead: true 
    },
    { 
        name: "Intercessione di Heyman!", 
        text: "Diventi un assistito di Paul Heyman! ... Per ora ti aiuta.", 
        type: 'special', 
        effect_desc: "Ottieni un turno extra immediato.", 
        extra_turn: true 
    },
    { 
        name: "Say His Name!", 
        text: "Sei in un momento di difficoltà, ma poi ti ricordi che esiste un Local Hero... Joe Hendry arriva in tuo soccorso!", 
        type: 'special', 
        effect_desc: "Avanzi di 2 caselle E tutti gli avversari retrocedono di 1 casella ciascuno.", 
        move_steps: 2, 
        move_all_others: -1 
    },
    { 
        name: "I lie, i cheat, I steal!", 
        text: "Eddie l'avrebbe fatto, lo sappiamo tutti.", 
        type: 'special', 
        effect_desc: "Vai direttamente alla casella 40.", 
        target_cell: 40 
    },
    { 
        name: "I hear voices in my head!", 
        text: "Ti parlano e ti dicono di tornare indietro. No, sentire le voci non è sempre un bene.", 
        type: 'malus', 
        effect_desc: "Retrocedi di 2 caselle.", 
        move_steps: -2 
    },
    { 
        name: "Rest In Peace!", 
        text: "Tutto diventa nero... Chokeslam e Piledriver.", 
        type: 'malus', 
        effect_desc: "Retrocede alla casella 1 (Partenza).", 
        reset_position: true 
    },
];

let gameState = {
    players: [],
    currentTurnIndex: 0,
    game_over: false,
    cardDeck: [...CARDS],
    cardDrawCells: CARD_DRAW_CELLS,
    lastDiceRoll: 0
};

// [ FUNZIONI DI LOGICA DI GIOCO ]
/** Shuffla l'array in modo casuale (Algoritmo Fisher-Yates) */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/** Inizializza o resetta lo stato di gioco per un nuovo turno. */
function initializeGame() {
    gameState.cardDeck = [...CARDS];
    shuffleArray(gameState.cardDeck);
    gameState.game_over = false;
    gameState.currentTurnIndex = 0;
    gameState.lastDiceRoll = 0;
    
    // Assegna posizioni iniziali e simboli ai giocatori connessi
    gameState.players.forEach((player, index) => {
        player.position = 1;
        player.symbol = PLAYER_SYMBOLS[index % PLAYER_SYMBOLS.length];
        player.skippedTurns = 0;
    });
}

/** Tira un dado D6. */
function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

/** Estrae una carta dal mazzo (e la rimette in fondo). */
function drawCard() {
    if (gameState.cardDeck.length === 0) {
        gameState.cardDeck = [...CARDS];
        shuffleArray(gameState.cardDeck);
    }
    const card = gameState.cardDeck.shift();
    gameState.cardDeck.push(card);
    return card;
}

/** Calcola il percorso per l'animazione. */
function calculatePath(start, end) {
    const path = [];
    if (start < end) {
        for (let i = start + 1; i <= end; i++) {
            path.push(i);
        }
    } else if (start > end) {
        for (let i = start - 1; i >= end; i--) {
            path.push(i);
        }
    }
    return path;
}

/** Avanza al turno del prossimo giocatore valido (non saltato). */
function nextTurnLogic() {
    if (gameState.players.length === 0) return;

    let startIndex = gameState.currentTurnIndex;
    let nextIndex = (gameState.currentTurnIndex + 1) % gameState.players.length;
    
    // Controlla il prossimo giocatore e salta quelli bloccati
    while (gameState.players[nextIndex].skippedTurns > 0) {
        gameState.players[nextIndex].skippedTurns--;
        nextIndex = (nextIndex + 1) % gameState.players.length;
        
        if (nextIndex === startIndex) {
            break; 
        }
    }

    gameState.currentTurnIndex = nextIndex;
    return gameState.players[gameState.currentTurnIndex];
}

/**
 * Gestisce il movimento del giocatore.
 * @param {number} diceRoll - Il risultato del dado.
 * @param {boolean} isCardMove - Se il movimento è causato da una carta (non attiva altre carte).
 */
function processPlayerMove(diceRoll, isCardMove = false) {
    const player = gameState.players[gameState.currentTurnIndex];
    const oldPosition = player.position;
    let newPosition = player.position + diceRoll;

    // --- LOGICA VITTORIA E RIMBALZO ---
    let event = null;
    let isNewTurn = true;

    if (newPosition >= TOTAL_CELLS) {
        if (newPosition === TOTAL_CELLS) {
            newPosition = TOTAL_CELLS;
            player.position = newPosition;
            gameState.game_over = true;
            event = { type: 'win' };
        } else {
            // Rimbalzo: rimane fermo se supera 100
            newPosition = player.position; 
        }
    } else {
        // Aggiorna la posizione
        player.position = newPosition;
        
        // --- LOGICA CARTA (solo se non è una mossa a cascata da carta) ---
        if (!isCardMove && CARD_DRAW_CELLS.includes(newPosition)) {
            event = { type: 'card', data: drawCard() };
            isNewTurn = false; // Non passare al prossimo turno finché la carta non è risolta
        } else {
            // Passa al prossimo turno se non c'è una carta da pescare o l'evento è stato gestito
            nextTurnLogic();
        }
    }
    
    return {
        playerId: player.id,
        diceRoll: diceRoll,
        path: calculatePath(oldPosition, newPosition),
        finalPosition: newPosition,
        event: event,
        isNewTurn: isNewTurn
    };
}

/**
 * Trova il giocatore più avanti o più indietro.
 * @param {string} type - 'farthest_backward' (più indietro), 'farthest_ahead' (più avanti).
 * @returns {Object|null} Il giocatore trovato o null.
 */
function findTargetPlayer(type, currentPosition, currentPlayerID) {
    const otherPlayers = gameState.players.filter(p => p.id !== currentPlayerID);
    if (otherPlayers.length === 0) return null;

    if (type === 'farthest_backward') {
        // Trova il giocatore con la posizione più bassa (più indietro)
        return otherPlayers.reduce((farthest, p) => p.position < farthest.position ? p : farthest, otherPlayers[0]);
    }

    if (type === 'farthest_ahead') {
        // Trova il giocatore con la posizione più alta (più avanti)
        return otherPlayers.reduce((farthest, p) => p.position > farthest.position ? p : farthest, otherPlayers[0]);
    }

    return null;
}

/**
 * Applica l'effetto della carta e gestisce i movimenti a cascata.
 * @param {Object} card - L'oggetto carta da elaborare.
 */
function processCardEffect(card) {
    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    const playerUpdates = [];
    let win = null;
    let cascadedCard = null;
    let extraTurn = false;
    
    // --- FUNZIONE AUSILIARIA PER APPLICARE MOVIMENTO E TRACKING ---
    const applyMovement = (player, steps) => {
        const oldPos = player.position;
        let newPos = oldPos + steps;
        
        // Applica i limiti (1 a 100)
        newPos = Math.max(1, newPos);
        newPos = Math.min(TOTAL_CELLS, newPos); 

        if (newPos !== oldPos) {
            player.position = newPos;
            playerUpdates.push({
                id: player.id,
                path: calculatePath(oldPos, newPos),
                newPos: newPos
            });
            // Controlla la vittoria
            if (newPos === TOTAL_CELLS) {
                gameState.game_over = true; // <--- CORREZIONE: Imposta game_over subito
                return player.id;
            }
        }
        return null;
    };
    
    // --- 1. PRE-ELABORAZIONE VARIABILI ---
    let finalMoveSteps = card.move_steps || 0;

    if (card.move_multiplier) {
        finalMoveSteps = gameState.lastDiceRoll * card.move_multiplier;
    }
    
    // --- 2. Movimenti Collettivi (move_all, move_all_to_start) ---
    if (card.move_all || card.move_all_to_start) {
        const steps = card.move_all || 0;
        
        gameState.players.forEach(p => {
            const currentSteps = card.move_all_to_start ? 1 - p.position : steps;
            const winner = applyMovement(p, currentSteps);
            if (winner) win = winner;
        });
        
        // CORREZIONE: Se la partita è finita a causa di una carta collettiva, termina qui.
        if (win) {
             return { playerUpdates, win, cascadedCard: null, extraTurn: false, isNewTurn: false };
        }
        
    } else {
        // --- 3. Logica Target Multipli e Speciali (su player corrente) ---
        
        if (card.target_cell) {
            finalMoveSteps = card.target_cell - currentPlayer.position;
        }
        
        if (card.reset_position) {
            finalMoveSteps = 1 - currentPlayer.position; 
        }
        
        // Applica il movimento del giocatore corrente
        if (finalMoveSteps !== 0) {
            const winner = applyMovement(currentPlayer, finalMoveSteps);
            if (winner) {
                win = winner;
                // CORREZIONE: Se la partita è finita, esci
                return { playerUpdates, win, cascadedCard: null, extraTurn: false, isNewTurn: false };
            }
        }

        // --- 4. Logica Target su altri giocatori ---

        // Target: Pipe Bomb! (Il più avanti retrocede alla tua casella attuale.)
        if (card.target_nearest_ahead_back_to_self) {
            const target = findTargetPlayer('farthest_ahead', currentPlayer.position, currentPlayer.id); 
            if (target) {
                const stepsToMove = currentPlayer.position - target.position;
                applyMovement(target, stepsToMove); 
            }
        }

        // Target: Underdog from the Underground! (Il più indietro avanza alla tua casella attuale.)
        if (card.target_farthest_backward_to_self) {
            const target = findTargetPlayer('farthest_backward', currentPlayer.position, currentPlayer.id);
            if (target) {
                const stepsToMove = currentPlayer.position - target.position;
                applyMovement(target, stepsToMove); 
            }
        }

        // Target: Say His Name! (retrocede tutti gli avversari)
        if (card.move_all_others) {
            gameState.players.forEach(p => {
                if (p.id !== currentPlayer.id) {
                    // Applica il movimento e controlla la vittoria
                    const otherWinner = applyMovement(p, card.move_all_others); 
                    if (otherWinner) win = otherWinner; // Imposta il vincitore se un avversario ha vinto
                }
            });
        }
        
        // CORREZIONE: Controlla la vittoria dopo i movimenti sugli avversari
        if (win) {
             return { playerUpdates, win, cascadedCard: null, extraTurn: false, isNewTurn: false };
        }
        
        // Target: Doppio Salto Turno (Double Count-Out!)
        if (card.skip_self_and_farthest_ahead) {
            currentPlayer.skippedTurns += 1;
            const target = findTargetPlayer('farthest_ahead', currentPlayer.position, currentPlayer.id);
            if (target) {
                target.skippedTurns += 1;
            }
        }
        
        // --- 5. Turni Saltati e Turni Extra (solo sul giocatore corrente e sugli altri) ---
        if (card.skip_next_turn) { // Ref Bump!
            currentPlayer.skippedTurns += 1;
        }
        if (card.extra_turn) { // Intercessione di Heyman!
            extraTurn = true;
        }
        if (card.skip_all_others) { // Underdog from the Underground!
            gameState.players.forEach(p => {
                if (p.id !== currentPlayer.id) {
                    p.skippedTurns += 1;
                }
            });
        }

    } // Fine blocco else (non move_all)


    // --- 6. Controllo Carta a Cascata (solo per il giocatore corrente e se non c'è vittoria) ---
    // Verifichiamo se il giocatore corrente SI È MOSSO e la sua nuova posizione è una casella carta.
    if (!win && !card.move_all && !card.move_all_to_start) 
    {
        const playerMoved = playerUpdates.some(update => update.id === currentPlayer.id);
        
        if (playerMoved && CARD_DRAW_CELLS.includes(currentPlayer.position)) {
            cascadedCard = {
                card: drawCard(),
                position: currentPlayer.position,
                playerID: currentPlayer.id
            };
            // Se c'è una cascata, annulliamo un eventuale extra_turn (la cascata ha priorità)
            extraTurn = false; 
        }
    }

    // --- 7. Passaggio del Turno (solo se non c'è extra turno o cascata) ---
    let isNewTurn = true;
    if (extraTurn || cascadedCard || win) {
        isNewTurn = false; // Se c'è extra turno o cascata, il turno non finisce O la partita finisce
    } else {
        nextTurnLogic();
    }


    return {
        playerUpdates,
        win,
        cascadedCard,
        extraTurn,
        isNewTurn,
        // Restituisci il giocatore di turno DOPO la logica di avanzamento/extra turno
        currentPlayerID: gameState.players[gameState.currentTurnIndex] ? gameState.players[gameState.currentTurnIndex].id : null
    };
}


// ==========================================================
// 🌐 GESTIONE SOCKET.IO (Multiplayer)
// ==========================================================
let currentPlayers = {};

/** Emette lo stato di gioco completo a tutti i client. */
function emitGameState() {
    io.emit('game state update', {
        ...gameState,
        // Invia solo i dati essenziali per il client
        players: gameState.players.map(p => ({
            id: p.id,
            position: p.position,
            symbol: p.symbol,
            skippedTurns: p.skippedTurns
        })),
        TOTAL_CELLS: TOTAL_CELLS,
        currentPlayerID: gameState.players[gameState.currentTurnIndex] ? gameState.players[gameState.currentTurnIndex].id : null,
        cardDrawCells: CARD_DRAW_CELLS 
    });
}


io.on('connection', (socket) => {
    console.log(`[SERVER] Nuovo giocatore connesso: ${socket.id}`);

    const newPlayer = {
        id: socket.id,
        position: 1,
        symbol: PLAYER_SYMBOLS[gameState.players.length % PLAYER_SYMBOLS.length],
        skippedTurns: 0
    };

    gameState.players.push(newPlayer);
    currentPlayers[socket.id] = newPlayer; 
    
    if (gameState.players.length === 1) {
        initializeGame();
    }

    emitGameState();
    
    // --------------------------------------------------
    // EVENTI GESTITI DAL CLIENT
    // --------------------------------------------------

    // Richiesta di tiro del dado
    socket.on('roll dice request', () => {
        if (gameState.game_over || gameState.players.length === 0 || gameState.players[gameState.currentTurnIndex].id !== socket.id) {
            return;
        }

        const diceRoll = rollDice();
        gameState.lastDiceRoll = diceRoll;

        const moveResult = processPlayerMove(diceRoll);

        // 1. Invia il risultato della mossa con i dettagli della carta (se presente)
        io.emit('game state update', {
            ...gameState,
            moveResult: moveResult,
            players: gameState.players.map(p => ({ 
                id: p.id, 
                position: p.position, 
                symbol: p.symbol,
                skippedTurns: p.skippedTurns
            })),
            // Manteniamo lo stesso currentPlayerID se non è un nuovo turno
            currentPlayerID: gameState.players[gameState.currentTurnIndex] ? gameState.players[gameState.currentTurnIndex].id : null,
            cardDrawCells: CARD_DRAW_CELLS
        });
        
        // 2. Se la mossa ha completato il ciclo (non c'è carta e non c'è vittoria), invia l'aggiornamento dello stato finale dopo un breve ritardo
        if (moveResult.isNewTurn || (moveResult.event && moveResult.event.type === 'win')) {
            setTimeout(emitGameState, 1000); 
        }
    });

    // Richiesta di elaborazione dell'effetto carta
    socket.on('process card effect request', (card) => {
        // Verifica che il giocatore sia quello di turno
        if (gameState.game_over || gameState.players.length === 0 || gameState.players[gameState.currentTurnIndex].id !== socket.id) {
            return;
        }
        
        const effectResult = processCardEffect(card);
        
        // 1. Invia il risultato dell'effetto carta a tutti (per animazioni)
        io.emit('card effect update', {
            ...effectResult,
            // Per il client di turno, dobbiamo sapere se può tirare ancora
            currentPlayerID: effectResult.currentPlayerID 
        });

        // 2. Aggiornamento finale dello stato (solo se la risoluzione è finita o c'è extra turno)
        if (effectResult.isNewTurn || effectResult.extraTurn || effectResult.win) {
             // Se extraTurn=true, il currentPlayerID resta lo stesso, ma isNewTurn=false. 
             // Emettiamo comunque l'aggiornamento per abilitare il pulsante.
             setTimeout(emitGameState, 1500);
        } else if (effectResult.cascadedCard) {
            // Se c'è una cascata, non facciamo nulla. Il client richiamerà 'process card effect request'
        }
    });


    // Gestione della disconnessione
    socket.on('disconnect', () => {
        console.log(`[SERVER] Giocatore disconnesso: ${socket.id}`);
        
        const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            const wasCurrent = (playerIndex === gameState.currentTurnIndex);
            
            gameState.players.splice(playerIndex, 1);
            delete currentPlayers[socket.id];

            if (wasCurrent && gameState.players.length > 0) {
                if (gameState.currentTurnIndex >= gameState.players.length) {
                    gameState.currentTurnIndex = 0;
                }
                nextTurnLogic(); 
            } else if (gameState.players.length === 0) {
                gameState.game_over = true;
            }
        }
        
        emitGameState();
    });
});


// ==========================================================
// 🌐 CONFIGURAZIONE EXPRESS (Server Web)
// ==========================================================

// Configurazione per file statici
app.use(express.static(path.join(__dirname, 'public'))); 

// Routing esplicito per la homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gioco.html')); 
});

// Avvia il server
server.listen(PORT, () => {
    console.log(`\n-------------------------------------------------`);
    console.log(`🚀 Server Node.js avviato sulla porta ${PORT}`);
    console.log(`🌐 Apri: http://localhost:${PORT}`);
    console.log(`-------------------------------------------------\n`);
});