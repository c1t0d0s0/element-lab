// シミュレーションを、画面の書きかえの回数 (60Hz・120Hz・144Hz など) によらず、1秒に60回の決まった間隔で進める。
// 120Hz の画面では2回に1回だけ進め、重くて30fpsしか出ない端末では1回の描画で2回進める

// 1回に進める時間 (ms)。反応・落下・温度変化の速さは、この間隔で1回進めることを前提に決めてある
export const SIM_STEP_MS = 1000 / 60;
// 1回の描画で進める回数の上限。重い端末で追いつこうとしてさらに重くなるのを防ぐ (これより遅い端末ではゆっくり進む)
export const MAX_STEPS_PER_FRAME = 3;
// 60Hz の画面で描画の間隔が少しゆれても、0回と2回が交互にならないように見のがす幅 (1回分に対する割合)
const STEP_TOLERANCE = 0.1;

export class FixedStepClock {
  private last: number | null = null;
  private accumulated = 0;

  // 前の描画からの時間 (ms) に合わせて、今回シミュレーションを進める回数を返す
  public steps(now: number): number {
    if (this.last === null) {
      this.last = now;
      return 1;
    }
    const elapsed = Math.max(0, now - this.last);
    this.last = now;
    this.accumulated += elapsed;
    let steps = Math.floor(this.accumulated / SIM_STEP_MS + STEP_TOLERANCE);
    if (steps > MAX_STEPS_PER_FRAME) {
      // タブを裏にしていた後などは、たまった分を一気に進めずに捨てる
      steps = MAX_STEPS_PER_FRAME;
      this.accumulated = 0;
    } else {
      this.accumulated -= steps * SIM_STEP_MS;
    }
    return steps;
  }

  // 一時停止の間の時間を、再開したときに取りもどそうとしないように忘れる
  public reset() {
    this.last = null;
    this.accumulated = 0;
  }
}
