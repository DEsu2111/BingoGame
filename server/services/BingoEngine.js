import { checkWin } from '../utils/winChecker.js';

export class BingoEngine {
    static validateMark(card, row, col, calledNumbers) {
        const cell = card?.[row]?.[col];
        if (!cell) return { valid: false, error: 'INVALID_POSITION' };

        // value 0 is FREE cell
        if (cell.value !== 0 && !calledNumbers.includes(cell.value)) {
            return { valid: false, error: 'NUMBER_NOT_CALLED' };
        }

        return { valid: true, cell };
    }

    static checkBingo(markedSet) {
        return checkWin(markedSet);
    }
}
