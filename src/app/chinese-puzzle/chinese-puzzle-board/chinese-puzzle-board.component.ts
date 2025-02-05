import { Component, inject } from '@angular/core';
import { ChinesePuzzleStore } from '../chinese-puzzle.store';
import { ToolsService } from '../../common/tools.service';
import { Direction, Piece } from '../chinese-puzzle.type';
import { CdkDragEnd, CdkDragStart } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-chinese-puzzle-board',
  standalone: false,

  templateUrl: './chinese-puzzle-board.component.html',
  styleUrl: './chinese-puzzle-board.component.less'
})
export class ChinesePuzzleBoardComponent {
  private store = inject(ChinesePuzzleStore);
  private tools = inject(ToolsService);
  // 单元格尺寸
  cellSize = 150;
  // 由于边框问题，这里加一个偏移量
  cellOffset = 5;

  Direction = Direction;
  canMoveDirections: Direction[] = [];


  boardWidth = this.store.boardWidth();
  boardHeight = this.store.boardHeight();

  dataSetNames = this.store.dataSetNames;
  dataSetName = this.store.dataSetName;

  pieces = this.store.pieces;
  boardState = this.store.board;
  finished = this.store.finished;

  piece: Piece | null = null;
  startPosition: { x: number, y: number } | null = null;

  steps = 0;

  ngOnInit() {
    this.store.initBoard();
  }

  // 检查是否可以移动棋子
  canMove(piece: Piece, direction: Direction): boolean {
    // 计算目标位置
    let targetX = piece.x;
    let targetY = piece.y;

    if (direction === Direction.Up) targetY -= 1;
    if (direction === Direction.Down) targetY += 1;
    if (direction === Direction.Left) targetX -= 1;
    if (direction === Direction.Right) targetX += 1;

    // 检查目标位置是否超出边界
    if (
      targetX < 0 ||
      targetY < 0 ||
      targetX + piece.width > this.boardWidth ||
      targetY + piece.height > this.boardHeight
    ) {
      return false;
    }

    // 检查目标位置是否被其他棋子占用
    for (let i = 0; i < piece.height; i++) {
      for (let j = 0; j < piece.width; j++) {
        const cellY = targetY + i;
        const cellX = targetX + j;

        if (this.boardState()[cellY][cellX] !== '' && this.boardState()[cellY][cellX] !== piece.name) {
          return false;
        }
      }
    }

    return true;
  }

  clickPiece(piece: Piece) {
    console.log('点击了棋子', piece);
    this.canMoveDirections = [];

    const canMoveUp = this.canMove(piece, Direction.Up);
    const canMoveDown = this.canMove(piece, Direction.Down);
    const canMoveLeft = this.canMove(piece, Direction.Left);
    const canMoveRight = this.canMove(piece, Direction.Right);
    if (canMoveUp) this.canMoveDirections.push(Direction.Up);
    if (canMoveDown) this.canMoveDirections.push(Direction.Down);
    if (canMoveLeft) this.canMoveDirections.push(Direction.Left);
    if (canMoveRight) this.canMoveDirections.push(Direction.Right);

    if (this.canMoveDirections.length == 1) {
      this.movePiece(piece, this.canMoveDirections[0]);
      // 还原
      this.resetClickOrDragState();
    } else {
      if (this.canMoveDirections.length != 0) {
        this.piece = piece;
      }
    }
  }

  // 移动棋子
  movePiece(piece: Piece, direction: Direction) {
    if (this.canMove(piece, direction)) {
      const boardState = this.tools.deepClone(this.boardState());
      // 清空棋子原位置
      for (let i = 0; i < piece.height; i++) {
        for (let j = 0; j < piece.width; j++) {
          boardState[piece.y + i][piece.x + j] = '';
        }
      }

      // 更新棋子位置
      if (direction === Direction.Up) piece.y -= 1;
      if (direction === Direction.Down) piece.y += 1;
      if (direction === Direction.Left) piece.x -= 1;
      if (direction === Direction.Right) piece.x += 1;

      // 填充棋子新位置
      for (let i = 0; i < piece.height; i++) {
        for (let j = 0; j < piece.width; j++) {
          boardState[piece.y + i][piece.x + j] = piece.name;
        }
      }

      // 更新状态
      this.store.updatePiece(piece);
      this.store.updateBoard(boardState);

      this.steps += 1;
    }
  }

  private resetClickOrDragState() {
    this.piece = null;
    this.startPosition = null;
    this.canMoveDirections = [];
  }
  onDragStart(piece: Piece, dragStart: CdkDragStart) {
    dragStart.source.element.nativeElement.style.zIndex = '20';
    const event: MouseEvent = dragStart.event as MouseEvent;
    this.piece = piece;
    this.startPosition = { x: event.clientX, y: event.clientY };
  }

  // 用户结束拖拽时触发
  onDragEnd(dragEnd: CdkDragEnd) {
    dragEnd.source.element.nativeElement.style.zIndex = '10';
    const event = dragEnd.event as MouseEvent;

    if (!this.piece || !this.startPosition) return;

    const deltaX = event.clientX - this.startPosition.x;
    const deltaY = event.clientY - this.startPosition.y;
    let dragSteps = 0;

    let direction: Direction | null = null;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? Direction.Right : Direction.Left;
      dragSteps = Math.abs(deltaX) / this.cellSize;
    } else {
      direction = deltaY > 0 ? Direction.Down : Direction.Up;
      dragSteps = Math.abs(deltaY) / this.cellSize;
    }
    if (direction && this.canMove(this.piece, direction)) {
      // 确定了方向，并且可以移动
      const piece = this.piece;
      this.movePiece(piece, direction);
      // 如果拖拽步数大于1，则继续移动
      if (dragSteps > 1) {
        this.movePiece(piece, direction);
      }
    } else {
      // 如果无法移动，还原
      dragEnd.source.reset();
    }

    this.resetClickOrDragState();
  }

  chnageDataSet(dataSetName: string) {
    this.store.chnageDataSet(dataSetName);
    this.steps = 0;
  }
}
