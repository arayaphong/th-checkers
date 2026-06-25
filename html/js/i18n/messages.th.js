export const th = {
  app: {
    title: 'เกมส์หมากฮอส - Thai Checkers',
    boardLabel: 'กระดานหมากฮอส',
    historyLabel: 'ประวัติการเดิน',
    controls: {
      undo: 'ย้อนกลับ (Undo)',
      redo: 'ทำซ้ำ (Redo)',
      reset: 'เริ่มเกมใหม่ (Reset)',
      review: 'กลับ',
      playAgain: 'เริ่มใหม่',
      soundOn: 'เปิดเสียง',
      soundOff: 'ปิดเสียง',
      loadState: 'โหลดตำแหน่งจากไฟล์',
      language: 'เปลี่ยนภาษา',
    },
    viewport: {
      title: 'แสดงผลไม่ได้',
      descriptionLine1: 'พื้นที่แสดงผลเล็กเกินไป',
      descriptionLine2: 'กรุณาขยายหน้าต่างให้ใหญ่ขึ้น',
    },
  },
  players: {
    white: 'ผู้เล่นมาคอว์',
    black: 'ผู้เล่นกระตั้ว',
    whiteIcon: 'มาคอว์',
    blackIcon: 'กระตั้ว',
  },
  pieces: {
    pion: 'หมากธรรมดา',
    dame: 'ฮอส',
    count: ({ type, count }) => `${type} ${count} ตัว`,
  },
  board: {
    unplayable: 'ช่องที่เดินไม่ได้',
    noLegalMove: 'ไม่มีตาเดินที่ถูกต้อง',
    empty: 'ช่องว่าง',
    selected: 'เลือกอยู่',
    legalTarget: 'เดินมาช่องนี้ได้',
    square: ({ coordinate, details }) => `${coordinate}: ${details}`,
  },
  status: {
    gameOver: 'เกมจบแล้ว',
    turn: ({ player }) => `ตาของ${player}`,
  },
  history: {
    capture: ({ count }) => `กินหมาก ${count} ตัว`,
    captureTitle: ({ count }) => `กินหมาก${count > 1 ? ` ${count} ตัว` : ''}`,
    promotion: 'เลื่อนขั้นเป็น dame',
    current: 'ตำแหน่งปัจจุบัน',
    entry: ({ index, player, from, to, details }) =>
      `ตาที่ ${index}, ${player}, เดินจาก ${from} ไป ${to}${details}`,
  },
  stats: {
    noneCaptured: ({ capturer }) => `${capturer} ยังไม่ได้กินหมาก`,
    captured: ({ capturer, owner, counts }) =>
      `${capturer} กินหมากของ${owner}: ${counts.join(' และ ')}`,
  },
  loadState: {
    errorTitle: 'โหลดตำแหน่งไม่ได้',
    errors: {
      invalidJson: 'ไฟล์ไม่ใช่ JSON ที่ถูกต้อง',
      unsupportedVersion: 'เวอร์ชันไฟล์ไม่รองรับ',
      invalidPieces: 'ข้อมูล "pieces" ไม่ถูกต้องหรือไม่มี',
      invalidCoordinate: 'พิกัดบนกระดานไม่ถูกต้อง',
      invalidPiece: 'สีหรือชนิดหมากไม่ถูกต้อง',
      duplicateCoordinate: 'พิกัดซ้ำกัน',
      tooManyPieces: 'หมากมากเกินไป (สูงสุด 16 ตัว)',
      unknown: 'โหลดไฟล์ไม่สำเร็จ',
    },
  },
  gameOver: {
    initialTitle: 'ผู้เล่นมาคอว์ ชนะ!',
    winner: ({ player }) => `${player} ชนะ!`,
    initialDescription: 'ฝ่ายตรงข้ามไม่มีหมากเหลือให้เดิน',
    reasons: {
      noMoves: 'ไม่มีตาให้เดินต่อได้',
      noPieces: 'ถูกกินหมากจนหมดกระดาน',
    },
  },
};
