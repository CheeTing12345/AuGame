// Simple multiplayer using localStorage (works for local testing)
// Can be upgraded to WebSocket/Firebase later

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No confusing chars
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function createRoom(playerName) {
  const code = generateRoomCode()
  const playerId = `player_${Date.now()}`
  
  const room = {
    code,
    createdAt: Date.now(),
    player1: {
      id: playerId,
      name: playerName,
      ready: false,
    },
    player2: null,
    currentQuestion: 0,
    gameState: 'waiting',
    answers: {},
  }
  
  localStorage.setItem(`room_${code}`, JSON.stringify(room))
  localStorage.setItem('playerId', playerId)
  localStorage.setItem('myPlayerNumber', '1')
  
  return { code, playerId }
}

export function joinRoom(code, playerName) {
  const roomKey = `room_${code}`
  const roomData = localStorage.getItem(roomKey)
  
  if (!roomData) {
    throw new Error('Room not found')
  }
  
  const room = JSON.parse(roomData)
  
  if (room.player2) {
    throw new Error('Room is full')
  }
  
  const playerId = `player_${Date.now()}`
  
  room.player2 = {
    id: playerId,
    name: playerName,
    ready: false,
  }
  
  localStorage.setItem(roomKey, JSON.stringify(room))
  localStorage.setItem('playerId', playerId)
  localStorage.setItem('myPlayerNumber', '2')
  
  return { playerId, room }
}

export function getRoom(code) {
  const roomData = localStorage.getItem(`room_${code}`)
  return roomData ? JSON.parse(roomData) : null
}

export function updateRoom(code, updates) {
  const room = getRoom(code)
  if (!room) return null
  
  const updated = { ...room, ...updates }
  localStorage.setItem(`room_${code}`, JSON.stringify(updated))
  return updated
}

export function setPlayerReady(code, playerNumber) {
  const room = getRoom(code)
  if (!room) return null
  
  if (playerNumber === 1) {
    room.player1.ready = true
  } else {
    room.player2.ready = true
  }
  
  // If both ready, start game
  if (room.player1.ready && room.player2?.ready) {
    room.gameState = 'playing'
  }
  
  localStorage.setItem(`room_${code}`, JSON.stringify(room))
  return room
}

// Alias for compatibility
export function updatePlayerReady(code, playerId, ready) {
  const room = getRoom(code)
  if (!room) return null
  
  // Find which player this is
  if (room.player1?.id === playerId) {
    room.player1.ready = ready
  } else if (room.player2?.id === playerId) {
    room.player2.ready = ready
  }
  
  // If both ready, start game
  if (room.player1?.ready && room.player2?.ready) {
    room.gameState = 'playing'
  }
  
  localStorage.setItem(`room_${code}`, JSON.stringify(room))
  return room
}


export function submitAnswer(code, playerNumber, questionIndex, answer) {
  const room = getRoom(code)
  if (!room) return null
  
  if (!room.answers[questionIndex]) {
    room.answers[questionIndex] = {}
  }
  
  room.answers[questionIndex][`player${playerNumber}`] = answer
  
  localStorage.setItem(`room_${code}`, JSON.stringify(room))
  return room
}

export function getMyPlayerNumber() {
  return localStorage.getItem('myPlayerNumber')
}

export function getPartnerAnswer(code, questionIndex, myPlayerNumber) {
  const room = getRoom(code)
  if (!room) return null
  
  const partnerNumber = myPlayerNumber === '1' ? '2' : '1'
  return room.answers[questionIndex]?.[`player${partnerNumber}`]
}

export function leaveRoom(code) {
  localStorage.removeItem(`room_${code}`)
  localStorage.removeItem('playerId')
  localStorage.removeItem('myPlayerNumber')
  localStorage.removeItem('currentRoomCode')
}
