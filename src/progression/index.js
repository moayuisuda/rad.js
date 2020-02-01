import {
    Time,
    Transport,
} from 'tone'
import {
    template,
    loopMap,
    synth
} from './sources'
import {
    chord as getChord
} from '../chord.js/index'
import {
    ChordItem
} from './chordItem'
import Vue from 'vue/dist/vue.js'
import {
    handleFiles,
    antiShake
} from './utils'

let instance = new Vue({
    template,
    data: {
        flag: 0,
        bpm: 70,
        type: 'scale',
        types: [
            'scale',
            'quick'
        ],
        input: {
            single: '4',
            amount: '4',
            chord: 'CM7'
        },
        initOctive: 4,
        timeline: [],
        json: [],
        playing: false
    },

    watch: {
        bpm: {
            handler(val, oldVal) {
                antiShake(() => {
                    if(val < 10) {
                        this.bpm = 10;
                        return;
                    }
                    if(val > 200) {
                        this.bpm = 200;
                        return;
                    }
                    
                    this.changeWave();
                    Transport.bpm.value = val;
                    this.caculateTime();
                })
            },
            immediate: true
        },
    },

    created() {
        let initChords = [{
                "amount": "4",
                "single": "4",
                "chord": "FM7",
                "type": "scale"
            },
            {
                "amount": "4",
                "single": "4",
                "chord": "Em7",
                "type": "scale"
            },
            {
                "amount": "4",
                "single": "4",
                "chord": "Dm7",
                "type": "scale"
            },
            {
                "amount": "4",
                "single": "4",
                "chord": "CM7",
                "type": "scale"
            }
        ]

        for (let i of initChords) {
            let loop = loopMap[i.type](synth, getChord(i.chord, this.initOctive), i.single);
            let chordItem = new ChordItem(Object.assign(i, {
                loop,
                instance: this
            }));
            this.timeline.push(chordItem);
        }

        this.caculateTime();
    },

    methods: {
        changeWave() {
            let waveOne = document.querySelector('.wave--one');
            let waveTwo = document.querySelector('.wave--two');
            waveOne.style.animationDuration = Math.ceil(360 / this.bpm) + 's';
            waveTwo.style.animationDuration = Math.ceil(360 / this.bpm) + 's';
        },

        toggle() {
            if (this.playing) this.stop();
            else this.start();
        },

        start() {
            this.playing = true;
            Transport.stop();
            Transport.start();
        },

        stop() {
            this.playing = false;
            this.flag = this.timeline.length - 1;
            Transport.stop();
        },

        exportJson() {
            let data = [];
            for (let i of this.timeline) {
                let {
                    amount,
                    single,
                    chord,
                    type
                } = i;

                data.push({
                    amount,
                    single,
                    chord,
                    type
                })
            }

            let
                json = JSON.stringify(data, undefined, 4),
                blob = new Blob([json], {
                    type: 'text/json'
                }),
                e = document.createEvent('MouseEvents'),
                a = document.createElement('a')
            a.download = 'RAD-PROGRESSION.json'
            a.href = window.URL.createObjectURL(blob)
            a.dataset.downloadurl = ['text/json', a.download, a.href].join(':')
            e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
            a.dispatchEvent(e)
        },

        async importJson(e) {
            let data = await handleFiles(e);
            let json = JSON.parse(data);

            for (let i of json) {
                let loop = loopMap[i.type](synth, getChord(i.chord, this.initOctive), i.single);
                let chordItem = new ChordItem(Object.assign(i, {
                    loop,
                    instance: this
                }));
                this.timeline.push(chordItem);
            }

            this.caculateTime();
        },

        addItem({
            amount,
            single,
            chord,
            type
        }) {
            let chordArr;

            try {
                chordArr = getChord(chord, this.initOctive);
            } catch (e) {
                console.log(e);
                return;
            }

            if (!(amount.match(/^\d$/) && single.match(/^\d$/)))
                throw `[Rad-Club] The parameter "${amount}/${single}" is not valid`

            let loop = loopMap[type](synth, chordArr, single);
            let chordItem = new ChordItem({
                chord,
                loop,
                type,
                amount,
                single,
                instance: this
            })

            this.timeline.splice(this.flag + 1, 0, chordItem);
            this.caculateTime();

            this.timeline[chordItem.flag].focus();
        },

        add() {
            let {
                amount,
                single,
                chord
            } = this.input;
            let type = this.type;

            this.addItem({
                amount,
                single,
                chord,
                type
            });
        },

        remove(instance) {
            this.timeline.splice(instance.flag, 1);
            this.caculateTime();
        },

        caculateLoop() {
            let tile = this.timeline[this.timeline.length - 1];
            if (tile) {
                Transport.loopEnd = this.timeline[this.timeline.length - 1].stop;
                Transport.loop = true;
            } else Transport.loop = false;
        },

        caculateTime() {
            Transport.cancel();

            let timeFlag = Time(0);
            let flag = 0;
            for (let item of this.timeline) {
                let {
                    loop,
                    amount,
                    single
                } = item;

                let start = timeFlag;
                timeFlag += amount * Time(`${single}n`);
                let stop = timeFlag;

                item.start = start;
                item.stop = stop;
                item.flag = flag++;

                loop.cancel();
                loop.start(item.start);

                loop.loop = Number(amount);
                loop.loopEnd = `${single}n`;

                Transport.schedule((time) => {
                    item.setFlag();
                }, item.start);
            }

            this.caculateLoop();
        }
    }
})

export {
    instance
}