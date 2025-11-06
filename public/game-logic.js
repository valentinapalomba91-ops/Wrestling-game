// ==========================================================
// FILE: game-logic.js
// Contiene lo stato, le regole e le funzioni di aggiornamento del gioco.
// Progettato per essere eseguito su un server (in futuro) o come Core Engine.
// Non ha riferimenti diretti all'HTML/DOM.
// ==========================================================

const TOTAL_CELLS = 100;
const CARD_DRAW_PROBABILITY = 0.30; 
const NUM_PLAYERS = 4;
const playerPawns = ['🤼‍♂️', '🏆', '👨‍⚖️', '🏅']; 

let players = [];
let cardDrawCells = new Set();
let currentPlayerIndex = 0;
let lastDiceRoll = 0; 
let skippedTurns = {}; 
let game_over = false; 

// --- 1. Definizione delle Carte (25 Carte Totali) ---
const cardDeck = [
    // 1. CARTE BONUS E AVANZAMENTO (5)
    { type: 'bonus', move: 3, text: 'Claymore! Drew McIntyre intercede per te e colpisce tutti con una Claymore!', effect_desc: 'Avanzi di 3 caselle.' }, 
    { type: 'bonus', move: 2, text: 'Figure Four Leglock! Diventi parte della famiglia Flair e apprendi di diritto la Figure Four. WOOO!', effect_desc: 'Avanzi di 2 caselle.' }, 
    { type: 'bonus', move: 5, text: 'Spear from Nowhere! Roman Reigns ed Edge ti insegnano a fare una spear spettacolare!', effect_desc: 'Avanzi di 5 caselle.' }, 
    { type: 'bonus', move: 0, multiply_roll: 3, text: 'Take your vitamins! Ascolti Hulk Hogan, preghi e prendi le tue vitamine (VITAMINE EH!)', effect_desc: 'Avanza della distanza pari al tuo ultimo lancio del dado moltiplicato per 3.' }, 
    { type: 'bonus', move: 0, move_all: 3, text: 'Swanton Bomb! la creatrice del gioco vede una Swanton fatta da Jeff Hardy, si mette a piangere ed immersa nella tristezza fa avanzare tutti di tre caselle.', effect_desc: 'Tutti avanzano di 3 caselle.' }, 

    // 2. CARTE MALUS (6)
    { type: 'malus', move: -3, text: 'BOTCHONE! Sin Cara si impossessa di te e Botchi qualsiasi cosa.', effect_desc: 'Retrocedi di 3 caselle.' },
    { type: 'malus', move: -2, text: 'Il Judgment Day esiste ancora! JD doveva esplodere mille anni fa, ma è ancora qui e nessuno sa perchè. In ogni caso decide di interferire nel tuo match a tuo sfavore.', effect_desc: 'Retrocedi di 2 caselle.' },
    { type: 'malus', move: -1, text: 'Burn it Down! Durante il tuo match parte la theme di Seth Rollins, che appare sullo stage vestito come una guardia svizzera che, in un moto di pazzia, ha tinto i vestiti di giallo, verde, arancione e viola fluo. Sopra indossa una tenda da doccia rossa con le paperelle e gli occhiali più grandi della sua faccia. Ride. Ti distrai, anzi, probabilmente ti accechi.', effect_desc: 'Retrocedi di 1 casella.' },
    { type: 'malus', move: -2, text: 'Cody inizia a ringraziare tutti! Cody vince la coppa del nonno, fa un promo dove nomina tutta la sua famiglia e inizia a ringraziare chiunque.', effect_desc: 'Retrocedi di 2 caselle.' },
    { type: 'malus', move: -1, text: 'Non capisci cosa dica Jey Uso! YEET! Jey ti dice cosa fare, ma tu capisci solo Yeet e un paio di Uce. Nel dubbio tu Yeetti e va male.', effect_desc: 'Retrocedi di 1 casella.' },
    { type: 'malus', move: -1, text: 'Il cameraman inquadra Stephanie Vaquer, Booker T impazzisce! Non capisci più una mazza fra la Vaquer e Booker T che sbraita e scivoli sulla tua stessa bava.', effect_desc: 'Retrocedi di 1 casella.' },

    // 3. CARTE CONTROLLO E SPECIALI DI MASSA (14)
    { type: 'special', move: 4, text: 'Mami is always on top! Rhea Ripley ti prende sotto la sua ala e ti aiuta con una Riptide! Ora sei un/una bimbo/bimba di Rhea!', effect_desc: 'Avanzi di 4 caselle.' },
    { type: 'special', move: 1, text: 'One Final Time! FU (AAA me fa schifo) di Cena! Johnny Boy ti aiuta un\'ultima volta.', effect_desc: 'Avanzi di 1 casella.' },
    { type: 'special', move: 0, target_farthest_punish: true, text: 'Pipe Bomb! L\'anima di Cm Punk si reincarna in te e fai un promo della madonna (messa solo per par condicio).', effect_desc: 'Il giocatore più avanti retrocede alla tua casella!' },
    { type: 'special', move: 0, target_cell: 40, text: 'I lie, i cheat, I steal! Eddie l\'avrebbe fatto, lo sappiamo tutti.', effect_desc: 'Vai direttamente alla casella 40.' },
    { type: 'malus', move: -2, text: 'I hear voices in my head! Ti parlano e ti dicono di tornare indietro. No, sentire le voci non è sempre un bene.', effect_desc: 'Retrocedi di 2 caselle.' },
    { type: 'malus', move: 0, reset_position: true, text: 'Rest In Peace! Tutto diventa nero, senti un rintocco di una campana. Non capisci, ti volti e Undertaker è dietro di te. Hai paura e lo sai. Chokeslam e Piledriver.', effect_desc: 'Indietreggia fino alla partenza (Casella 1)!' }, 
    { type: 'malus', move: 0, reset_all: true, text: 'Vince returns! Vince McMahon ritorna, distrugge tutti i piani di Triple H e ripristina la sua egemonia. No chance in hell!', effect_desc: 'Tutti i giocatori tornano alla casella 1.' }, 
    { type: 'special', move: 0, target_nearest_help: true, text: 'Underdog from the Underground! Sami Zayne è una brava persona che aiuta sempre il più svantaggiato. E poi è simpatico. Ucey.', effect_desc: 'Il giocatore più indietro avanza alla tua casella, tutti gli altri saltano un turno.' }, 
    { type: 'bonus', move: 0, move_all: 2, text: 'Samoan dynasty! Il risultato di un test del DNA svolto da Rikishi mostra che tutti i giocatori sono samoani e per effetto immediato vengono assunti dalla WWE. Si scopre anche tutti i giocatori sono figli suoi.', effect_desc: 'Tutti avanzano di 2 caselle.' }, 
    { type: 'malus', move: 0, move_all: -2, text: 'Stunner! Stunner! Stunner! Stone Cold Steve Austin colpisce tutti con una Stunner e poi si sbrodola birra addosso. Forse era ubriaco.', effect_desc: 'Tutti retrocedono di 2 caselle.' }, 
    { type: 'malus', move: 0, skip_next_turn: true, text: 'Ref Bump! Hey, la WWE ne piazza uno ogni due match, perchè io non dovrei metterlo?', effect_desc: 'Il giocatore salta il prossimo turno.' },
    { type: 'malus', move: 0, skip_self_and_farthest: true, text: 'Double Count-Out! Tu e il giocatore più avanti vi fermate dal paninaro mentre lottatate fuori dal ring.', effect_desc: 'Tu e il giocatore più avanti saltate un turno.' },
    { type: 'special', move: 0, extra_turn: true, text: 'Intercessione di Heyman! Diventi un assistito di Paul Heyman! Se sei incapace coi promo li farà lui per te, ti assicurerà un posto d\'onore nel roster e soprattutto, lo sai, ti tradirà. Per ora ti aiuta e tiri di nuovo il dado.', effect_desc: 'Ottieni un turno extra immediato.' },
    { type: 'special', move: 2, punish_others: 1, is_combined: true, text: 'Say His Name! Sei in un momento di difficoltà, ma poi ti ricordi che esiste un Local Hero e tu credi in lui, ci credi fortissimo e pronunci il suo nome. Joe Hendry arriva in tuo soccorso!', effect_desc: 'Avanzi di 2 caselle e gli avversari retrocedono di 1 casella.' }
];
// (Controllo di sicurezza, dovrebbe essere 25)
if (cardDeck.length !== 25) {
    console.error("Errore: Il mazzo di carte non contiene 25 carte! Verifica il conteggio.");
}


// --- 2. Funzioni Utility Interne ---

/** Genera la posizione Grid (Row/Col) per l'output visivo. */
function getGridPosition(i) {
    const size = 10;
    let row, col;
    const zeroIndexedRow = Math.floor((i - 1) / size); 
    const oneIndexedRow = zeroIndexedRow + 1;
    
    if (oneIndexedRow % 2 !== 0) { 
        col = (i - 1) % size + 1;
    } else { 
        col = size - ((i - 1) % size);
    }
    row = size - zeroIndexedRow; 
    return { row: row, col: col };
}

/** Ottiene il giocatore più avanti */
function getFarthestPlayer() {
    let farthest = players[0];
    for (let i = 1; i < players.length; i++) {
        if (players[i].position > farthest.position) {
            farthest = players[i];
        }
    }
    return farthest;
}

/** Ottiene il giocatore più indietro (diverso dal corrente) */
function getNearestPlayer(currentPlayer) {
    let otherPlayers = players.filter(p => p.id !== currentPlayer.id);
    if (otherPlayers.length === 0) return null;

    let nearest = otherPlayers[0];
    for (const player of otherPlayers) {
        if (player.position < nearest.position) {
            nearest = player;
        }
    }
    return nearest;
}

/** Tira il dado e aggiorna l'ultima mossa */
function rollDice() {
    const roll = Math.floor(Math.random() * 6) + 1; 
    lastDiceRoll = roll;
    return roll;
}

/** Trova una carta casuale dal mazzo */
function drawCard() {
    const cardIndex = Math.floor(Math.random() * cardDeck.length);
    return cardDeck[cardIndex];
}


// --- 3. Funzioni di Inizializzazione e Stato Pubblico ---

/** Inizializza lo stato del gioco e il tabellone. */
function initializeGame() {
    players = Array(NUM_PLAYERS).fill(0).map((_, i) => ({
        id: i + 1,
        position: 1, 
        symbol: playerPawns[i % playerPawns.length] 
    }));
    currentPlayerIndex = 0;
    lastDiceRoll = 0; 
    skippedTurns = {}; 
    game_over = false;

    // Generazione caselle carta
    const availableCells = Array.from({ length: TOTAL_CELLS - 2 }, (_, i) => i + 2); 
    const numCardDrawCells = Math.floor((TOTAL_CELLS - 2) * CARD_DRAW_PROBABILITY);
    const shuffledCells = availableCells.sort(() => 0.5 - Math.random());
    cardDrawCells = new Set(shuffledCells.slice(0, numCardDrawCells));
    
    if (!cardDrawCells.has(70)) { // Forza la casella Vince Returns
        cardDrawCells.add(70); 
    }
}

/** Restituisce l'intera struttura dello stato del gioco. */
function getGameState() {
    return {
        players: players,
        currentPlayer: players[currentPlayerIndex],
        lastDiceRoll: lastDiceRoll,
        skippedTurns: skippedTurns,
        game_over: game_over,
        boardSize: TOTAL_CELLS,
        cardDrawCells: Array.from(cardDrawCells)
    };
}

/**
 * Funzione esposta che calcola il movimento del giocatore dopo un tiro di dado.
 * Non esegue l'animazione, ma restituisce la sequenza di posizioni da attraversare.
 * @param {number} roll - Il risultato del dado.
 * @returns {object} Un oggetto contenente l'esito della mossa e l'eventuale carta.
 */
function processPlayerMove(roll) {
    if (game_over) return { success: false, reason: "Game Over" };

    const player = players[currentPlayerIndex];
    const oldPosition = player.position;
    let targetPosition = oldPosition + roll;

    const moveResult = {
        playerId: player.id,
        path: [], // Array di posizioni che la pedina deve attraversare per l'animazione
        finalPosition: oldPosition,
        event: null, // { type: 'card', data: card } o 'win'
        isNewTurn: false,
    };
    
    // 1. Calcola il percorso iniziale
    let currentPath = [];
    let currentPos = oldPosition;
    
    // Movimento in avanti fino al 100 o al target
    while (currentPos < Math.min(TOTAL_CELLS, targetPosition)) {
        currentPos++;
        currentPath.push(currentPos);
    }
    
    // 2. Regola del Rimbalzo
    if (targetPosition > TOTAL_CELLS) {
        const overshoot = targetPosition - TOTAL_CELLS;
        targetPosition = TOTAL_CELLS - overshoot; // Nuova posizione finale
        
        // Percorso di ritorno (rimbalzo)
        for (let i = TOTAL_CELLS - 1; i >= targetPosition; i--) {
            currentPath.push(i);
        }
    }
    
    moveResult.path = currentPath;
    moveResult.finalPosition = targetPosition;

    // 3. Controllo Vittoria Esatta
    if (targetPosition === TOTAL_CELLS) {
        player.position = TOTAL_CELLS; 
        moveResult.event = { type: 'win' };
        game_over = true;
        return moveResult;
    }
    
    // 4. Aggiorna posizione finale del giocatore (anche se c'è una carta)
    player.position = targetPosition;

    // 5. Controllo Carta
    if (cardDrawCells.has(targetPosition)) {
        const card = drawCard();
        moveResult.event = { type: 'card', data: card };
        // La gestione del turno e l'avanzamento avverranno DOPO l'applicazione dell'effetto carta
    } else {
        // Nessuna carta, avanza al prossimo turno
        nextTurnLogic();
        moveResult.isNewTurn = true;
    }

    return moveResult;
}

/** * Applica l'effetto di una carta e calcola lo stato del gioco risultante.
 * @param {object} card - La carta da applicare.
 * @returns {object} Un oggetto contenente l'esito della carta (aggiornamenti di posizione, turni saltati, ecc.)
 */
function processCardEffect(card) {
    if (game_over) return { success: false, reason: "Game Over" };
    
    const player = players[currentPlayerIndex];
    const effect = {
        type: card.type,
        text: card.text,
        desc: card.effect_desc,
        playerUpdates: [], // { id: 1, oldPos: 50, newPos: 55, path: [51, 52, 53, 54, 55] }
        skippedPlayers: [],
        extraTurn: false,
        isNewTurn: false,
        win: null
    };
    
    // --- FUNZIONE INTERNA PER IL CALCOLO DEL PERCORSO DI CARTA ---
    function calculateCardPath(p, oldPos, newPos) {
        const path = [];
        if (oldPos === newPos) return [];
        
        if (oldPos < newPos) {
            for (let i = oldPos + 1; i <= newPos; i++) path.push(i);
        } else {
            for (let i = oldPos - 1; i >= newPos; i--) path.push(i);
        }
        return path;
    }
    
    // 1. TURNO EXTRA
    if (card.extra_turn) {
        effect.extraTurn = true;
    } 
    
    // 2. EFFETTI DI MOVIMENTO DI MASSA (Stunner, Swanton, Vince)
    else if (card.move_all !== undefined || card.reset_all) {
        const moveAmount = card.move_all || 0;
        const targetPosition = card.reset_all ? 1 : null;

        players.forEach(p => {
            const oldPos = p.position;
            let newPos;
            
            if (targetPosition !== null) {
                newPos = targetPosition;
            } else {
                newPos = Math.max(1, Math.min(TOTAL_CELLS, p.position + moveAmount));
            }

            if (newPos === TOTAL_CELLS) {
                effect.win = p.id;
                game_over = true;
            }
            
            if (!game_over) {
                p.position = newPos;
                effect.playerUpdates.push({
                    id: p.id,
                    oldPos: oldPos,
                    newPos: newPos,
                    path: calculateCardPath(p, oldPos, newPos)
                });
            }
        });
    }
    
    // 3. EFFETTI TARGETTIZZATI O COMBINATI
    else if (card.target_farthest_punish || card.target_nearest_help || card.skip_self_and_farthest || card.is_combined) {
        
        // a) PIPE BOMB! (Punisce il più avanti)
        if (card.target_farthest_punish) {
            const farthest = getFarthestPlayer();
            if (farthest.id !== player.id) {
                const oldPos = farthest.position;
                farthest.position = player.position; 
                effect.playerUpdates.push({
                    id: farthest.id,
                    oldPos: oldPos,
                    newPos: player.position,
                    path: calculateCardPath(farthest, oldPos, player.position)
                });
            }
        }

        // b) UNDERDOG! (Aiuta il più indietro e penalizza gli altri)
        else if (card.target_nearest_help) {
            const nearest = getNearestPlayer(player);
            if (nearest) { 
                const oldPos = nearest.position;
                nearest.position = player.position; 
                effect.playerUpdates.push({
                    id: nearest.id,
                    oldPos: oldPos,
                    newPos: player.position,
                    path: calculateCardPath(nearest, oldPos, player.position)
                });
                
                // Penalizza gli altri
                players.forEach((p, index) => {
                    if (p.id !== player.id && p.id !== nearest.id) {
                        skippedTurns[index] = true; 
                        effect.skippedPlayers.push(p.id);
                    }
                });
            }
        }

        // c) DOUBLE COUNT-OUT! (Salta turno per te e il più avanti)
        else if (card.skip_self_and_farthest) {
            const farthest = getFarthestPlayer();
            const farthestIndex = players.findIndex(p => p.id === farthest.id);
            
            if (farthestIndex !== currentPlayerIndex) {
                skippedTurns[farthestIndex] = true; 
                effect.skippedPlayers.push(farthest.id);
            }
            skippedTurns[currentPlayerIndex] = true; 
            effect.skippedPlayers.push(player.id);
        }
        
        // d) SAY HIS NAME! (Avanzo proprio + Retrocessione di massa)
        else if (card.is_combined) {
            // Movimento del giocatore corrente (non scatena carte)
            const oldPosSelf = player.position;
            const newPosSelf = Math.min(TOTAL_CELLS, player.position + card.move);
            
            player.position = newPosSelf;
            effect.playerUpdates.push({
                id: player.id,
                oldPos: oldPosSelf,
                newPos: newPosSelf,
                path: calculateCardPath(player, oldPosSelf, newPosSelf)
            });

            // Movimento degli altri (Retrocedono di 1)
            players.forEach(p => {
                if (p.id !== player.id) {
                    const oldPos = p.position;
                    const newPos = Math.max(1, p.position - card.punish_others);
                    p.position = newPos;
                    effect.playerUpdates.push({
                        id: p.id,
                        oldPos: oldPos,
                        newPos: newPos,
                        path: calculateCardPath(p, oldPos, newPos)
                    });
                }
            });
        }
    }

    // 4. MOVIMENTO SEMPLICE O MOLTIPLICATO
    else if (card.target_cell || card.reset_position || card.multiply_roll || card.move !== 0) {
        let move;
        if (card.target_cell) {
            move = card.target_cell - player.position;
        } else if (card.reset_position) {
            move = 1 - player.position; 
        } else if (card.multiply_roll) {
            move = lastDiceRoll * card.multiply_roll;
        } else {
            move = card.move;
        }
        
        const oldPos = player.position;
        let newPos = oldPos + move;

        // Gestione undershoot e overshoot/rimbalzo
        if (newPos < 1) newPos = 1;

        if (newPos > TOTAL_CELLS) {
            const overshoot = newPos - TOTAL_CELLS;
            newPos = TOTAL_CELLS - overshoot; 
        }
        
        // Controllo vittoria esatta da carta
        if (oldPos + move === TOTAL_CELLS) {
             newPos = TOTAL_CELLS;
             effect.win = player.id;
             game_over = true;
        }
        
        player.position = newPos;
        effect.playerUpdates.push({
            id: player.id,
            oldPos: oldPos,
            newPos: newPos,
            path: calculateCardPath(player, oldPos, newPos)
        });

        // Controlla SE questa mossa atterra su un'altra casella carta (solo per carte di movimento semplice)
        if (cardDrawCells.has(newPos) && newPos !== TOTAL_CELLS) {
            const nextCard = drawCard();
            effect.cascadedCard = { card: nextCard, position: newPos };
            // L'attivazione del prossimo turno verrà gestita DOPO l'effetto della cascata
        }
    }
    
    // 5. CARTA NEUTRA/PASSIVA (es. Ref Bump)
    if (card.skip_next_turn) {
        const nextPlayerIndex = (currentPlayerIndex + 1) % NUM_PLAYERS;
        skippedTurns[nextPlayerIndex] = true;
        effect.skippedPlayers.push(players[nextPlayerIndex].id);
    }
    
    // 6. Se non ci sono effetti a cascata o extra turno, avanza il turno
    if (!effect.extraTurn && !effect.cascadedCard && !game_over) {
        nextTurnLogic();
        effect.isNewTurn = true;
    }

    return effect;
}

/** Avanza il turno, gestendo i salti. */
function nextTurnLogic() {
    if (game_over) return;
    
    let nextPlayerIndex = (currentPlayerIndex + 1) % NUM_PLAYERS;
    
    // Gestione salti turno multipli
    let attempts = 0;
    while (skippedTurns[nextPlayerIndex] && attempts < NUM_PLAYERS) {
        delete skippedTurns[nextPlayerIndex]; // Rimuovi il flag di salto dopo averlo applicato
        nextPlayerIndex = (nextPlayerIndex + 1) % NUM_PLAYERS;
        attempts++;
    }
    
    currentPlayerIndex = nextPlayerIndex;
}


// Esporta le funzioni che l'HTML (o il futuro server) deve chiamare
// Nota: La funzione getGridPosition è utile anche al client per il rendering iniziale.
export {
    initializeGame,
    getGameState,
    rollDice,
    processPlayerMove,
    processCardEffect,
    getGridPosition,
    TOTAL_CELLS
};