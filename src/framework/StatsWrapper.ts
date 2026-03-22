import Stats from 'three/addons/libs/stats.module.js';

const STATS_VISIBLE_DISPLAY = 'block'

export class StatsWrapper {
    private stats: Stats
    private timer: number = 0
    private panelNum: number = 0
    private panelChangeInterval: number = 5000
    /** statsStyle===0 时隐藏面板，此时跳过 update 以降低每帧开销（大屏默认 0） */
    private hidden = true
    constructor() {
        this.stats = new Stats()
        const dom = this.stats.dom as HTMLElement
        dom.style.cssText = (dom.style.cssText || '') + ';z-index:99999;'
        this.statsStyle(0)
        document.body.appendChild(this.stats.dom)
    }

    /**
     * 0.hide 1.show(fps) 2.showAll(轮换 FPS/MS/MB)
     */
    statsStyle(style: number) {
        if (this.timer > 0) {
            clearInterval(this.timer)
            this.timer = 0
        }
        const dom = this.stats.dom as HTMLElement
        switch (style) {
            case 0:
                dom.style.display = 'none'
                this.hidden = true
                break
            case 1:
                this.stats.showPanel(0)
                dom.style.display = STATS_VISIBLE_DISPLAY
                this.hidden = false
                break
            case 2:
                dom.style.display = STATS_VISIBLE_DISPLAY
                this.stats.showPanel(0)
                this.hidden = false
                this.timer = window.setInterval(() => {
                    this.panelNum++
                    this.panelNum %= 3
                    this.stats.showPanel(this.panelNum)
                }, this.panelChangeInterval) as unknown as number
                break
        }
    }
    update():void {
        if (this.hidden) return
        this.stats.update()
    }
}