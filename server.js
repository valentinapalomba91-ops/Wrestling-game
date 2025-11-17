const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

// ==========================================================
// ⚙️ CONFIGURAZIONE INIZIALE
// ==========================================================
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
// Inizializzazione Socket.IO con CORS per permettere connessioni dal client
const io = new Server(server, {
    cors: {
        origin: "*", // Permette connessioni da qualsiasi origine (per testing)
        methods: ["GET", "POST"]
    }
});

// ==========================================================
// 🎲 CONSTANTI E STATO DI GIOCO
// ==========================================================

// Costanti di Gioco
const TOTAL_CELLS = 40;
const PLAYER_SYMBOLS = ['⭐', '🚀', '🔮', '🦄', '👽', '🦖', '🐉', '🤖'];
const CARD_DRAW_CELLS = [5, 10, 15, 20, 25, 30, 35]; // Le caselle in cui si pesca una carta

let gameState = {
    players: [],
    currentTurnIndex: 0,
    game_over: false,
    gameLog: [],
    lastDiceRoll: 0,
    winner: null
};

/**
 * Aggiunge un evento al log di gioco.
 * @param {string} message Il messaggio da loggare.
 * @param {('dice'|'card'|'general'|'win')} type Il tipo di evento.
 */
function logEvent(message, type = 'general') {
    const timestamp = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    gameState.gameLog.push({ timestamp, message, type });
    // Limita la dimensione del log
    if (gameState.gameLog.length > 50) {
        gameState.gameLog.shift();
    }
}

/**
 * Inizializza o resetta lo stato del gioco.
 */
function initializeGame() {
    if (gameState.players.length > 0) {
        gameState.players.forEach(p => p.position = 1);
        gameState.currentTurnIndex = 0;
        gameState.game_over = false;
        gameState.winner = null;
        logEvent('Nuova partita iniziata! Tutti alla casella 1.', 'general');
    } else {
        logEvent('In attesa di giocatori per iniziare la partita.', 'general');
    }
}

/**
 * Simula il lancio di un dado a 6 facce.
 * @returns {number} Il risultato del lancio.
 */
function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

// ==========================================================
// 🃏 LOGICA CARTE
// ==========================================================

// Definizioni delle carte
const CARD_DEFINITIONS = [
    { 
        title: "Avanza Veloce", 
        description: "Avanzi di 3 caselle extra. Ottieni un altro turno.", 
        effect: (player) => { 
            const newPos = Math.min(TOTAL_CELLS, player.position + 3);
            player.position = newPos;
            logEvent(`${player.name} avanza di 3 caselle a **casella ${player.position}**! Ottiene un turno extra!`, 'card');
            return {
                movements: [{ playerId: player.id, newPosition: newPos }],
                extraTurn: true,
                win: newPos === TOTAL_CELLS
            };
        } 
    },
    { 
        title: "Ritorno a Casa", 
        description: "Torni alla casella di partenza (1). Turno normale.", 
        effect: (player) => { 
            player.position = 1; 
            logEvent(`${player.name} è stato rispedito alla casella **1**!`, 'card');
            return {
                movements: [{ playerId: player.id, newPosition: 1 }],
                extraTurn: false,
                win: false
            };
        } 
    },
    { 
        title: "Salta Turno", 
        description: "Il tuo prossimo turno è saltato.", 
        effect: (player) => { 
            player.skippedTurns += 1; // Salta il turno corrente, ma la logica del prossimo turno gestirà lo skip
            logEvent(`${player.name} deve saltare il suo prossimo turno!`, 'card');
            return {
                movements: [],
                extraTurn: false,
                win: false
            };
        } 
    },
    { 
        title: "Pesca Ancora", 
        description: "Pesca immediatamente un'altra carta.", 
        effect: (player) => { 
            logEvent(`${player.name} pesca subito un'altra carta! (Cascata)`, 'card');
            return {
                movements: [],
                extraTurn: false,
                win: false,
                cascade: true // Indica al client che deve pescare subito la prossima carta
            };
        } 
    },
    { 
        title: "Torna Indietro", 
        description: "Indietreggi di 4 caselle.", 
        effect: (player) => { 
            const newPos = Math.max(1, player.position - 4);
            player.position = newPos;
            logEvent(`${player.name} indietreggia di 4 caselle a **casella ${player.position}**!`, 'card');
            return {
                movements: [{ playerId: player.id, newPosition: newPos }],
                extraTurn: false,
                win: false
            };
        } 
    },
];

/**
 * Estrae una carta casuale dal mazzo.
 * @returns {object} La definizione della carta.
 */
function drawCard() {
    const randomIndex = Math.floor(Math.random() * CARD_DEFINITIONS.length);
    return CARD_DEFINITIONS[randomIndex];
}

// ==========================================================
// ➡️ LOGICA DEL TURNO E MOVIMENTO
// ==========================================================

/**
 * Logica per passare al turno successivo, gestendo i turni saltati.
 */
function nextTurnLogic() {
    if (gameState.game_over || gameState.players.length === 0) return;

    let attempts = 0;
    let originalIndex = gameState.currentTurnIndex;
    
    // Trova il prossimo giocatore che può giocare
    do {
        // Passa al giocatore successivo nell'array (ciclico)
        gameState.currentTurnIndex = (gameState.currentTurnIndex + 1) % gameState.players.length; 
        
        // Se il giocatore successivo ha turni da saltare
        if (gameState.players[gameState.currentTurnIndex].skippedTurns > 0) {
            const player = gameState.players[gameState.currentTurnIndex];
            player.skippedTurns--; // Consuma un turno saltato
            logEvent(`${player.name} ${player.symbol} salta il suo turno (Turni rimanenti: ${player.skippedTurns}).`, 'general');
            
            attempts++;
        } else {
            // Trovato il prossimo giocatore valido (che non deve saltare)
            logEvent(`È il turno di **${gameState.players[gameState.currentTurnIndex].name}** ${gameState.players[gameState.currentTurnIndex].symbol}.`, 'general');
            break; 
        }

        // Se siamo tornati al punto di partenza (solo giocatori che saltano)
        if (gameState.currentTurnIndex === originalIndex) { 
            // Se tutti i giocatori devono saltare, diamo il turno al primo e rompiamo il loop
            if (attempts >= gameState.players.length) {
                 logEvent('Tutti i giocatori hanno dovuto saltare, resetto e passo al prossimo giocatore disponibile.', 'general');
                 break;
            }
        }

    } while (attempts < gameState.players.length * 2); 
    // Il loop continua finché non trova un giocatore che può giocare, o previene il loop infinito.
}

/**
 * Processa il movimento di un giocatore in base al dado.
 * @param {number} diceRoll Risultato del dado.
 * @returns {object} Risultato del movimento con o senza evento carta.
 */
function processPlayerMove(diceRoll) {
    const player = gameState.players[gameState.currentTurnIndex];
    let newPosition = player.position + diceRoll;
    let event = null;
    let isNewTurn = true; // Di default si passa al prossimo turno

    // Logica di vittoria
    if (newPosition >= TOTAL_CELLS) {
        newPosition = TOTAL_CELLS;
        gameState.game_over = true;
        gameState.winner = player.id;
        logEvent(`🏆 **${player.name} ${player.symbol} HA VINTO!** 🏆`, 'win');
        event = { type: 'win', data: player.name };
    } 
    // Logica della carta
    else if (CARD_DRAW_CELLS.includes(newPosition)) {
        const card = drawCard();
        logEvent(`${player.name} è atterrato sulla casella carta (${newPosition}). Deve pescare.`, 'card');
        event = { type: 'card', data: card };
        isNewTurn = false; // Il turno non passa finché l'effetto carta non è risolto (client gestisce 'movement finished' -> 'card to draw')
    }
    
    const startPosition = player.position;
    player.position = newPosition;
    
    return {
        playerId: player.id,
        diceRoll: diceRoll,
        startPosition: startPosition, 
        endPosition: newPosition,
        event: event,
        isNewTurn: isNewTurn // Se VERO, il turno passa dopo l'animazione di movimento. Se FALSO, si aspetta l'azione della carta.
    };
}

/**
 * Applica l'effetto di una carta e aggiorna lo stato del gioco.
 * @param {object} card La carta pescata (minimal object dal client).
 * @returns {object} I risultati dell'effetto carta per l'animazione.
 */
function processCardEffect(card) {
    const player = gameState.players[gameState.currentTurnIndex];
    
    // Troviamo la definizione completa della carta per eseguire l'effetto
    const cardDef = CARD_DEFINITIONS.find(c => c.title === card.title);
    
    if (!cardDef) {
        logEvent(`Errore: Carta ${card.title} non trovata. Il turno passa.`, 'general');
        nextTurnLogic(); 
        return { cardApplied: { playerID: player.id }, extraTurn: false, win: false };
    }

    const effectResult = cardDef.effect(player);
    
    // NOTA: Se effectResult.extraTurn è VERO, il turno NON passa automaticamente (sarà il client a dirci quando finisce l'animazione)
    // Se effectResult.extraTurn è FALSO, il client dovrà confermare l'animazione, e solo allora il turno passerà in 'card animation finished' listener.

    return {
        cardApplied: {
            title: cardDef.title,
            description: cardDef.description,
            playerID: player.id
        },
        movements: effectResult.movements || [], // Movimenti generati dall'effetto (es. avanza/indietreggia)
        extraTurn: effectResult.extraTurn || false, 
        win: effectResult.win || false, 
        cascadedCard: effectResult.cascade ? { card: drawCard(), playerID: player.id } : null, // Se si deve pescare subito un'altra carta
    };
}

// ==========================================================
// 🌐 GESTIONE SOCKET.IO (Multiplayer)
// ==========================================================
let currentPlayers = {};

/**
 * Funzione di utilità per restituire in modo sicuro l'ID del giocatore corrente.
 * @returns {string | null}
 */
function getCurrentPlayerId() {
    const player = gameState.players[gameState.currentTurnIndex];
    // ✅ CORREZIONE: Restituisce null se non ci sono giocatori o l'indice è fuori range
    return player ? player.id : null; 
}


/**
 * Estrae lo stato essenziale del gioco da inviare al client, nascondendo la logica interna.
 * @returns {object} Stato di gioco essenziale.
 */
function getEssentialGameState() {
    return {
        players: gameState.players.map(p => ({
            id: p.id,
            position: p.position,
            symbol: p.symbol,
            skippedTurns: p.skippedTurns,
            name: p.name 
        })),
        TOTAL_CELLS: TOTAL_CELLS,
        // ✅ CORREZIONE: Uso della funzione sicura
        currentPlayerID: getCurrentPlayerId(),
        cardDrawCells: CARD_DRAW_CELLS,
        gameLog: gameState.gameLog,
        game_over: gameState.game_over,
        winner: gameState.winner
    };
}

/**
 * Invia l'intero stato di gioco a tutti i client.
 */
function emitGameState() {
    io.emit('game state update', getEssentialGameState());
}

/**
 * Funzione helper per inviare il risultato del dado per l'animazione.
 */
function emitDiceResult(moveResult) {
    // Invia un evento specifico per l'animazione del dado
    io.emit('dice roll result', { 
        moveResult: moveResult,
        // Invia lo stato essenziale aggiornato (posizione cambiata ma turno NON ancora passato)
        ...getEssentialGameState() 
    });
}


io.on('connection', (socket) => {
    console.log(`[SERVER] Nuovo giocatore connesso: ${socket.id}`);

    const newPlayer = {
        id: socket.id,
        name: `In attesa...`, 
        position: 1,
        symbol: PLAYER_SYMBOLS[gameState.players.length % PLAYER_SYMBOLS.length],
        skippedTurns: 0
    };

    gameState.players.push(newPlayer);
    currentPlayers[socket.id] = newPlayer; 
    
    logEvent(`Un giocatore ${newPlayer.symbol} si è unito. In attesa del nome...`, 'general');

    if (gameState.players.length === 1) {
        initializeGame(); // Inizializza al primo giocatore
    }

    emitGameState();
    
    /**
     * Listener per impostare il nome del giocatore.
     */
    socket.on('set player name', (name) => {
        const player = gameState.players.find(p => p.id === socket.id);
        if (player) {
            const oldName = player.name;
            const newName = String(name).trim().substring(0, 15);
            
            if (newName && newName !== oldName) {
                player.name = newName;
                console.log(`[SERVER] Giocatore ${socket.id} ha impostato il nome: ${player.name}`);
                
                logEvent(`${oldName.startsWith('In attesa') ? 'Un nuovo contendente' : oldName} ha scelto il nome **${player.name}** ${player.symbol}.`, 'general');
            }
            emitGameState(); 
        }
    });

    /**
     * Listener per la richiesta di lancio del dado.
     */
    socket.on('roll dice request', () => {
        const currentPlayer = gameState.players[gameState.currentTurnIndex]; 
        
        // Controllo: Il gioco non è finito, ci sono giocatori e il turno è di questo socket
        if (gameState.game_over || gameState.players.length === 0 || currentPlayer.id !== socket.id) {
            return;
        }

        const diceRoll = rollDice();
        gameState.lastDiceRoll = diceRoll;
        
        logEvent(`${currentPlayer.name} ${currentPlayer.symbol} tira un **${diceRoll}** a casella ${currentPlayer.position}.`, 'dice');

        const moveResult = processPlayerMove(diceRoll);
        
        // Invia il risultato del movimento per l'animazione (il turno non passa ancora)
        emitDiceResult(moveResult); 
    });

    /**
     * Listener per l'applicazione dell'effetto di una carta.
     * Viene chiamato dal client DOPO aver pescato la carta e averla mostrata.
     */
    socket.on('card effect request', (card) => {
        const currentPlayer = gameState.players[gameState.currentTurnIndex]; 
        
        // Controllo: Il gioco non è finito, ci sono giocatori e il turno è di questo socket
        if (gameState.game_over || gameState.players.length === 0 || currentPlayer.id !== socket.id) {
            return;
        }
        
        const effectResult = processCardEffect(card);
        
        // Invia i risultati dell'effetto carta (che include i path per ogni pedina mossa)
        // Il client DEVE eseguire l'animazione e poi inviare 'card animation finished'.
        io.emit('card effect update', {
            ...effectResult,
            ...getEssentialGameState()
        });
    });
    
    /**
     * Listener di conferma di fine movimento del dado (chiamato dal client DOPO l'animazione).
     * Questo gestisce la fine del turno O la pesca della carta.
     */
    socket.on('movement finished', (moveResult) => {
        
        // Verifica se c'è un giocatore attivo e se l'evento è per il giocatore corretto
        const currentPlayer = gameState.players[gameState.currentTurnIndex]; 
        
        if (moveResult && currentPlayer && moveResult.playerId === currentPlayer.id) {
            
            // Caso 1: Vittoria
            if (moveResult.event && moveResult.event.type === 'win') {
                emitGameState(); 
            } 
            // Caso 2: Movimento normale senza carta
            else if (moveResult.isNewTurn) {
                // Passa il turno e aggiorna lo stato visivo per tutti
                nextTurnLogic(); 
                emitGameState(); 
            } 
            // Caso 3: Carta Pescata (il turno NON passa, il client deve mostrare il modal carta)
            else if (moveResult.event && moveResult.event.type === 'card') {
                // Invia un evento specifico per mostrare la carta (non aggiorna lo stato finale)
                io.emit('card to draw', {
                    card: moveResult.event.data,
                    playerID: moveResult.playerId
                });
            }
        }
    });

    /**
     * Listener di conferma di fine animazione effetto carta (chiamato dal client DOPO l'animazione della carta).
     * Questo gestisce il passaggio del turno O la cascata (pesca di una nuova carta).
     */
    socket.on('card animation finished', (result) => {
        
        if (gameState.players.length === 0) return;
        const currentPlayer = gameState.players[gameState.currentTurnIndex];
        
        // Verifica se l'evento è per il giocatore corretto
        if (result && currentPlayer && result.cardApplied.playerID === currentPlayer.id) {

            // Caso 1: Vittoria
            if (result.win) {
                emitGameState(); 
            } 
            // Caso 2: Cascata (pesca subito la prossima carta)
            else if (result.cascadedCard) {
                // Se c'è una cascata, il server invia un nuovo evento 'card to draw' immediatamente.
                io.emit('card to draw', {
                    card: result.cascadedCard.card,
                    playerID: result.cascadedCard.playerID
                });
            } 
            // Caso 3: Nessun effetto imprevisto (extra turn o turno normale)
            else {
                // Se non c'era extraTurn, passiamo al turno successivo.
                if (!result.extraTurn) {
                    nextTurnLogic(); 
                } 
                // Altrimenti, rimane a lui.
                emitGameState(); 
            }
        }
    });


    /**
     * Gestione della disconnessione del giocatore.
     */
    socket.on('disconnect', () => {
        const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
        
        if (playerIndex !== -1) {
             const disconnectedPlayer = gameState.players[playerIndex]; 
             const disconnectedPlayerName = disconnectedPlayer.name; 
             const disconnectedPlayerSymbol = disconnectedPlayer.symbol;
             console.log(`[SERVER] Giocatore disconnesso: ${socket.id} (${disconnectedPlayerName})`);
             
             const wasCurrent = (playerIndex === gameState.currentTurnIndex);
             
             gameState.players.splice(playerIndex, 1);
             delete currentPlayers[socket.id];

             logEvent(`⚠️ **${disconnectedPlayerName} ${disconnectedPlayerSymbol}** ha lasciato la contesa.`, 'general');

             if (gameState.players.length > 0) { 
                 // 1. Correzione dell'indice: se il giocatore rimosso era prima, scala l'indice.
                 if (playerIndex < gameState.currentTurnIndex) {
                     gameState.currentTurnIndex--;
                 }
                 
                 // 2. Correzione dell'indice: se è ora fuori dai limiti (es. ultimo giocatore rimosso).
                 if (gameState.currentTurnIndex >= gameState.players.length) {
                     gameState.currentTurnIndex = 0;
                 }
                 
                 // 3. Forziamo il passaggio del turno se il giocatore disconnesso era quello attuale
                 if (wasCurrent) {
                     // nextTurnLogic si occupa anche di saltare i turni se necessario
                     nextTurnLogic(); 
                 }
                 
             } else {
                 // Nessun giocatore rimasto
                 gameState.game_over = true;
                 gameState.currentTurnIndex = 0; 
             }
             
             // Aggiorniamo sempre lo stato dopo la disconnessione per sbloccare l'UI.
             emitGameState(); 
        }
    });
});


// ==========================================================
// 🌐 CONFIGURAZIONE EXPRESS (Server Web)
// ==========================================================

// Configurazione per file statici
app.use(express.static(path.join(__dirname, 'public'))); 

// Routing esplicito per la homepage
app.get('/', (req, res) => {
    // Si presume che il file client si trovi in public/gioco.html
    res.sendFile(path.join(__dirname, 'public', 'gioco.html')); 
});

// Avvia il server
server.listen(PORT, () => {
    console.log(`\n-------------------------------------------------`);
    console.log(`🚀 Server Node.js avviato sulla porta ${PORT}`);
    console.log(`🌐 Apri: http://localhost:${PORT}`);
    console.log(`-------------------------------------------------\n`);
});