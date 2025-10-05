// Scroll Btween
// ScrollBtween uses scroll position of document - or any DOM element - to tween CSS values on any DOM element. 
// https://github.com/olivier3lanc/Scroll-Btween
const scrollBtween = {
    defaults: {
        // frameDurationinMs: 20, // Integer - Duration in ms between to animation states
        tweenerIntervalinMs: 300, // Integer - Smoothness of the change. Available only if Ola tweener is enabled, duration between to tweens
        enabled: true // boolean - Enable or disable
    },
    // Ola instance
    tween: {},
    tweenIndex: {},
    // Intersection
    // @el - object - The DOM object to detect
    // Returns float
    // value < 0 means the element is not visible yet
    // value between 0 and 1 means the element is currently visible into the viewport
    // 0 means the element starts into the vie wport
    // 1 means the element has just finished to run through the viewport
    // value > 1 means the element has past the viewport is not visible anymore
    getIntersection: function(el) {
        let response = -1;
        if (typeof el == 'object') {
            const detector_id = el.dataset.detector;
            if (detector_id !== undefined) {
                const el_detector = document.getElementById(detector_id);
                if (el_detector !== null) {
                    el = el_detector;
                }
            }
            if (typeof el.getBoundingClientRect == 'function') {
                const box = el.getBoundingClientRect();
                const el_offset_top = box.top + window.pageYOffset - document.documentElement.clientTop;
                const el_height = el.clientHeight;
                const window_scroll_top = (document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop;
                const window_height = window.document.documentElement.clientHeight;
                response = (window_scroll_top + window_height - el_offset_top) / (window_height + el_height);
            }
        }
        return response;
    },
    // Set up the animations
    update: function() {
        // Scan for animations
        let elems_anims = document.querySelectorAll('[scroll-btween]');
        if (elems_anims !== null) {
            
            let ola_object = {};
            elems_anims.forEach(function(anim) {
                const anim_id = anim.getAttribute('scroll-btween');
                // Start populating custom index to quickly retrieve useful data on scroll binding function
                scrollBtween['tweenIndex'][anim_id] = [];
                Object.keys(anim.dataset).forEach(function(property, forEachIndex) {
                    const sourceExpression = anim.dataset[property].split('|');
                    let finalExpression = [];
                    let index = 0;
                    if (forEachIndex === 0) {
                        scrollBtween.tweenIndex[anim_id] = { transfer: {}, properties: []};
                    }
                    sourceExpression.forEach(function(partial) {
                        const fromToArray = partial.split(' to ');
                        if (fromToArray.length > 1) {
                            const fromValue = parseFloat(fromToArray[0]);
                            const toValue = parseFloat(fromToArray[1]);
                            const tween_id = anim_id + '_' + property + '_' + index.toString();

                            if (typeof Ola == 'function') {
                                ola_object[tween_id] = fromValue;
                            }

                            finalExpression.push(tween_id);
                            // Build the transfer function
                            scrollBtween.tweenIndex[anim_id]['transfer'][tween_id] = function(scroll_line) {
                                let response = 0
                                if (typeof scroll_line == 'number') {
                                    // Limits between 0 and 1
                                    if (scroll_line > 1) {
                                        scroll_line = 1;
                                    }
                                    if (scroll_line < 0) {
                                        scroll_line = 0;
                                    }
                                    // Keypoints case
                                    if (partial.indexOf(':') > 0) {
                                        // 0:0 to 70:0 to 100:150
                                        // console.log(anim_id);
                                        let xa = 0;
                                        let ya = fromValue;
                                        let xb = 1;
                                        let yb = 1;
                                        fromToArray.forEach(function(keypoint, keyPointIndex) {
                                            // If not last
                                            if (keyPointIndex < fromToArray.length - 1) {
                                                const positionCurrent = parseFloat(keypoint.split(':')[0]) / 100;
                                                const positionNext = parseFloat(fromToArray[keyPointIndex + 1].split(':')[0]) / 100;
                                                
                                                if (scroll_line >= positionCurrent && scroll_line <= positionNext) {
                                                    // console.log(positionCurrent, scroll_line, positionNext);
                                                    xa = positionCurrent;
                                                    ya = parseFloat(keypoint.split(':')[1]);
                                                    xb = positionNext;
                                                    yb = parseFloat(fromToArray[keyPointIndex + 1].split(':')[1]);
                                                }
                                            }
                                        });
                                        const coef = (yb - ya) / (xb - xa);
                                        const y0 = yb - coef * xb;
                                        response = coef * scroll_line + y0;
                                        // console.log(anim_id, response);
                                        // console.log('scroll_line:'+scroll_line, 'yb:'+yb, 'ya:'+ya, 'xb:'+xb, 'xa:'+xa, 'response:'+response);
                                    }
                                    // Basic fromValue/toValue case
                                    else {
                                        response = (toValue - fromValue) * scroll_line + fromValue;
                                    }
                                }
                                return response;
                            }

                            index++;
                        }
                        else {
                            finalExpression.push(partial);
                        }
                    });
                    scrollBtween.tweenIndex[anim_id]['properties'].push({
                        property: property,
                        expression: finalExpression
                    });
                });
            });
            // Include important style
            document.getElementsByTagName('head')[0].insertAdjacentHTML('beforeend', '<style>[scroll-btween] { transition: none !important; }</style>');
            // Init Ola tweener
            if (typeof Ola == 'function') {
                scrollBtween['tween'] = Ola(ola_object);
            }
            // Init window scroll listener only if tweener is enabled
            if (typeof Ola == 'function') {
                window.addEventListener('scroll', scrollBtween.updateTweenerValues, {passive: true});
                window.addEventListener('load', scrollBtween.updateTweenerValues);
            }
            requestAnimationFrame(scrollBtween.apply);
            // Old method
            // scrollBtween.interval = setInterval(scrollBtween.frame, scrollBtween.defaults.frameDurationinMs);
        }
    },
    // Update tweener values witht new values from scroll bindr nodes
    // @delay - int - optional - Duration in ms to tween
    updateTweenerValues: function(delay = scrollBtween.defaults.tweenerIntervalinMs) {
        if (typeof Ola == 'function') {
            for (const anim_id in scrollBtween.tweenIndex) {
                if (Object.hasOwnProperty.call(scrollBtween.tweenIndex, anim_id)) {
                    const node = document.querySelector('[scroll-btween="'+anim_id+'"]');
                    if (node !== null) {
                        // Get scroll line
                        const scroll_line = scrollBtween.getIntersection(node);
                        // Get the target value to reach
                        let ola_update_set = {};
                        for (const tween_id in scrollBtween['tweenIndex'][anim_id]['transfer']) {
                            if (Object.hasOwnProperty.call(scrollBtween['tweenIndex'][anim_id]['transfer'], tween_id)) {
                                ola_update_set[tween_id] = scrollBtween['tweenIndex'][anim_id]['transfer'][tween_id](scroll_line);
                            }
                        }
                        scrollBtween.tween.set(ola_update_set, delay);
                    }
                }
            }
        }
    },
    // Work to to on each animation interval
    apply: function() {
        for (const anim_id in scrollBtween.tweenIndex) {
            if (Object.hasOwnProperty.call(scrollBtween.tweenIndex, anim_id)) {
                const node = document.querySelector('[scroll-btween="'+anim_id+'"]');
                if (node !== null) {
                    let scroll_line = 0;
                    if (typeof Ola == 'undefined') {
                        scroll_line = scrollBtween.getIntersection(node);
                    }
                    if (typeof scrollBtween['tweenIndex'][anim_id]['properties'] == 'object') {
                        scrollBtween['tweenIndex'][anim_id]['properties'].forEach(function(data) {
                            let completeTweenedValueToApply = '';
                            data.expression.forEach(function(partialValue) {
                                if (typeof scrollBtween['tweenIndex'][anim_id]['transfer'][partialValue] == 'function') {
                                    if (typeof Ola == 'function') {
                                        completeTweenedValueToApply += scrollBtween.tween[partialValue].toString();
                                    } else {
                                        completeTweenedValueToApply += scrollBtween['tweenIndex'][anim_id]['transfer'][partialValue](scroll_line).toString();
                                    }
                                } else {
                                    completeTweenedValueToApply += partialValue;
                                }
                            });
                            // Apply the final style on the specifed node
                            node.style[data.property] = completeTweenedValueToApply;
                        });
                    }
                }
            }
        }
        if (scrollBtween.defaults.enabled) {
            requestAnimationFrame(scrollBtween.apply);
        }
    },
    // Method to apply on each animatiton interval
    frame: function() {
        if (scrollBtween.defaults.enabled) {
            scrollBtween.apply();
        }
    },
    // Start / Resume animation interval
    start: function() {
        scrollBtween.defaults.enabled = true;
        requestAnimationFrame(scrollBtween.apply);
    },
    // Stop / Pause animation interval
    stop: function() {
        scrollBtween.defaults.enabled = false;
    }
}
scrollBtween.update();


// Audio
const loops = {
    sources: {},
    buffers: {},
    contexts: {},
    gains: {},
    stereoPanners: {},

    createAudio: function(url, name) {
        loops.contexts[name] = new AudioContext();
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => loops.contexts[name].decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                loops.buffers[name] = audioBuffer;
                loops.story._filesById[name].isLoaded = true;
                let count = 0;
                Object.keys(loops.story._filesById).forEach(function(name) {
                    if (loops.story._filesById[name].isLoaded) count++;
                })
                if (count === loops.story.files.length) {
                    loops._uiElements.btnPlayAll.disabled = false;
                }
            });
    },
    mix: function() {
        loops.story.scrollTrack.forEach(function(item, itemIndex) {
            const currentScrollTrack = loops.getCurrentScrollTrackPosition();
            if (currentScrollTrack >= item.scrollRange[0] && currentScrollTrack <= item.scrollRange[1]) {
                item.jobs.forEach(function(job, jobIndex) {
                    if (!loops.story._filesById[job.id].loop && !loops.story._filesById[job.id].isPlaying) {
                        loops.play(job.id);
                    }
                    switch (job.interface) {
                        case 'gains':
                            const jobTfnData = loops._tfnsData[itemIndex].jobs[jobIndex];
                            const currentGain = currentScrollTrack * jobTfnData.slope + jobTfnData.intercept;
                            // console.log(window.scrollY, job.id, currentGain);
                            loops.gains[job.id].gain.value = currentGain;
                            break;
                    }
                });
            }
        });
        // loops.controlRoom();
    },
    _computeScrollTrackJobs: function() {
        loops.story.scrollTrack.forEach(function(item) {
            const jobsData = {jobs: []};
            item.jobs.forEach(function(job) {
                const   slope = (job.valueRange[1] - job.valueRange[0]) / (item.scrollRange[1] - item.scrollRange[0]),
                        intercept = job.valueRange[1] - slope * item.scrollRange[1];
                jobsData.jobs.push({slope, intercept});
            });
            loops._tfnsData.push(jobsData);
        });
    },
    getCurrentScrollTrackPosition: function() {
        return 100 * window.scrollY / (document.body.clientHeight - window.innerHeight);
    },
    _tfnsData: [],
    play(name) {
        // const source = context.createBufferSource();
        // source.buffer = audioBuffer;
        // source.connect(context.destination);
        // source.start();
        // Source
        loops.sources[name] = loops.contexts[name].createBufferSource();
        loops.sources[name].buffer = loops.buffers[name];
        loops.sources[name].loop = loops.story._filesById[name].loop;
        
        // Create a stereo panner
        loops.stereoPanners[name] = loops.contexts[name].createStereoPanner();
        // Create Gain
        loops.gains[name] = loops.contexts[name].createGain();
        loops.gains[name].gain.value = 0;

        loops.sources[name]
            .connect(loops.gains[name])
            .connect(loops.stereoPanners[name])
            .connect(loops.contexts[name].destination);
        // If no gainNode
        // loops.audioSources[name].connect(loops.audioContexts[name].destination);
        if (loops.story._filesById[name].initialForcedStop) {
            loops.sources[name].addEventListener("ended", (evt) => {
                console.log(name, 'stopped', evt);
                loops.story._filesById[name].isPlaying = false;
                loops.story._filesById[name].hasPlayed = true;
                // loops.controlRoom();
            });
        }

        if (loops.story._filesById[name].isPlaying) {
            console.log(name+ ' is playing!')
            
        } else {
            loops.sources[name].start();
            loops.story._filesById[name].isPlaying = true;
        }
        // loops.controlRoom();
        
        
    },
    stop: function(name) {
        if (loops.story._filesById[name].isPlaying) loops.sources[name].stop();
        loops.story._filesById[name].isPlaying = false;
    },
    playAll: function() {
        window.addEventListener('scroll', loops.mix);
        // Play all
        Object.keys(loops.contexts).forEach(function(name) {
            loops.play(name);
        });

        // But stop non loop audio
        Object.keys(loops.story._filesById).forEach(function(name) {
            if (!loops.story._filesById[name].loop) {
                loops.stop(name);
                loops.story._filesById[name].initialForcedStop = true;
            }
        });

        loops.mix();

        loops._uiElements.btnStopAll.style.display = null;
        loops._uiElements.btnPlayAll.style.display = 'none';
    },
    stopAll: function() {
        Object.keys(loops.contexts).forEach(function(name) {
            loops.stop(name);
        });
        window.removeEventListener('scroll', loops.mix);
        loops._uiElements.btnStopAll.style.display = 'none';
        loops._uiElements.btnPlayAll.style.display = null;
    },
    muteAll: function() {
        Object.keys(loops.contexts).forEach(function(name) {
            loops.mute(name);
        });
    },
    unMuteAll: function() {
        Object.keys(loops.contexts).forEach(function(name) {
            loops.unMute(name);
        });
    },
    _uiElements: {},

    _isArray: function(data) {
        let response = false;
        if (typeof data == 'object') {
            if (Object.prototype.toString.call(data) === '[object Array]') {
                response = true;
            }
        };
        return response;
    },
    _createUIParametersAreOK: function(data) {
        let response = false;
        if (typeof data.name == 'string'
            && typeof data.parentName == 'string'
            && typeof data.htmlContent == 'string'
            && typeof data.elType == 'string'
            && loops._isArray(data.elAttributes)
            && typeof loops._uiElements[data.name] === 'undefined') {
            response = true;
        }
        return response;
    },
    _createUI: function({name, parentName, htmlContent, elType, elAttributes}) {
        if (loops._createUIParametersAreOK({name, parentName, htmlContent, elType, elAttributes})) {
            loops._uiElements[name] = document.createElement(elType);
            const newUIElement = loops._uiElements[name];
            newUIElement.id = `loops_${name}`;
            elAttributes.forEach(function(attr) {
                newUIElement.setAttribute(attr.name, attr.value);
            })
            newUIElement.innerHTML = htmlContent;
            const elUiParent = loops._uiElements[parentName];
            if (typeof elUiParent == 'object') {
                elUiParent.appendChild(newUIElement);
            }
            newUIElement.querySelectorAll('[data-ui-element]').forEach(function(el) {
                const uiName = el.dataset.uiElement;
                loops._uiElements[uiName] = el;
                if (loops._uiElements[uiName].id == '') loops._uiElements[uiName].id = `loops_${uiName}`;
            })
        }
    },
    setGain: function(name, value) {
        loops.gains[name].gain.value = value;
    },
    update: function() {
        // Create root element
        loops._uiElements.root = document.querySelector('#audio_commands');
        loops._createUI({
            name: 'audioCommands',
            parentName: 'root',
            htmlContent: `
                <button type="button"
                    class="p-5 | ff-700 fs-4 | c-neutral-100 bc-0 b-0 cur-pointer"
                    onclick="loops.playAll()"
                    data-ui-element="btnPlayAll"
                    title="Play Breaking Bad’s Theme compoosed by Dave Porter"
                    disabled>
                    <span class="c-secondary-100">P</span>lay <span class="c-secondary-100">Th</span>eme
                </button>
                <button type="button"
                    class="p-5 | ff-700 fs-4 | c-neutral-100 bc-0 b-0 cur-pointer"
                    onclick="loops.stopAll()"
                    data-ui-element="btnStopAll"
                    title="Stop Breaking Bad’s Theme"
                    style="display: none">
                    St<span class="c-secondary-100">O</span>p
                </button>
            `,
            elType: 'nav',
            elAttributes: [
                { name: 'class', value: 'd-flex ai-center' }
            ]
        });
        fetch('https://cdn.jsdelivr.net/gh/olivier3lanc/cinematics-resources/breaking_bad_intro/loops.json')
            .then(response => response.json())
            .then(json => {
                loops.story = json;
                loops.story._filesById = {};
                loops.story.files.forEach(function(file) {
                    loops.story._filesById[file.id] = {
                        loop: file.loop,
                        isPlaying: false,
                        isLoaded: false,
                        hasPlayed: false
                    };
                    loops.createAudio(file.path, file.id);
                });
                loops._computeScrollTrackJobs();
            })
            .catch(error => {
                // Handle the error
                console.log(error)
            });
    },
    mute: function(name) {
        loops.gains[name].gain.value = 0;
    },
    unMute: function(name) {
        loops.gains[name].gain.value = 1;
    }
}
loops.update();


// Breaking Bad Intro
const bb = {
    elTable1: document.querySelector('[scroll-btween="table1"]'),
    elTable2: document.querySelector('[scroll-btween="table2"]'),
    elFormulaes: document.querySelector('[scroll-btween="formulaes"]'),
    elSmokes: document.querySelectorAll('.smoke'),
    isFullscreen: false,
    data: [
        // Br group 17
        {
            target: 'elTable1',
            atomic_mass: 79.904,
            number: 35,
            symbol: 'Br',
            shells: [
                2,
                8,
                18,
                7
            ],
            oxidation_states: [
                '+5',
                '+3',
                '+1',
                '-1'
            ],
            top: '0%',
            left: '0%'
        },
        {
            target: 'elTable1',
            atomic_mass: 126.904473,
            number: 53,
            symbol: 'I',
            shells: [
                2,
                8,
                18,
                18,
                7
            ],
            oxidation_states: [
                '+7',
                '+5',
                '+3',
                '+1',
                '-1'
            ],
            top: 'calc(100% + 2px)',
            left: '0%'
        },
        {
            target: 'elTable1',
            atomic_mass: 35.45,
            number: 17,
            symbol: 'Cl',
            shells: [
                2,
                8,
                7
            ],
            oxidation_states: [
                '+5',
                '+3',
                '+1',
                '-1',
            ],
            top: 'calc(-100% - 2px)',
            left: '0%'
        },
        {
            target: 'elTable1',
            atomic_mass: 18.9984031636,
            number: 9,
            symbol: 'F',
            shells: [
                2,
                7
            ],
            oxidation_states: [
                '-1',
            ],
            top: 'calc(-200% - 4px)',
            left: '0%'
        },
        {
            target: 'elTable1',
            atomic_mass: 210,
            number: 85,
            symbol: 'At',
            shells: [
                2,
                8,
                18,
                32,
                18,
                7
            ],
            oxidation_states: [
                '+1',
                '-1',
            ],
            top: 'calc(200% + 4px)',
            left: '0%'
        },
        // group 18
        {
            target: 'elTable1',
            atomic_mass: 4.0026022,
            number: 2,
            symbol: 'He',
            shells: [
                2
            ],
            oxidation_states: [],
            top: 'calc(-300% - 6px)',
            left: 'calc(100% + 2px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 20.17976,
            number: 10,
            symbol: 'Ne',
            shells: [
                2,
                8
            ],
            oxidation_states: [],
            top: 'calc(-200% - 4px)',
            left: 'calc(100% + 2px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 39.9481,
            number: 18,
            symbol: 'Ar',
            shells: [
                2,
                8,
                8
            ],
            oxidation_states: [],
            top: 'calc(-100% - 2px)',
            left: 'calc(100% + 2px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 83.7982,
            number: 36,
            symbol: 'Kr',
            shells: [
                2,
                8,
                18,
                8
            ],
            oxidation_states: [
                '+2'
            ],
            top: '0%',
            left: 'calc(100% + 2px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 131.2936,
            number: 54,
            symbol: 'Xe',
            shells: [
                2,
                8,
                18,
                18,
                8
            ],
            oxidation_states: [
                '+8',
                '+6',
                '+4',
                '+2'
            ],
            top: 'calc(100% + 2px)',
            left: 'calc(100% + 2px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 222,
            number: 86,
            symbol: 'Rn',
            shells: [
                2,
                8,
                18,
                32,
                18,
                8
            ],
            oxidation_states: [],
            top: 'calc(200% + 4px)',
            left: 'calc(100% + 2px)'
        },
        // group 16
        {
            target: 'elTable1',
            atomic_mass: 15.999,
            number: 8,
            symbol: 'O',
            shells: [
                2,
                6
            ],
            oxidation_states: [
                '-2'
            ],
            top: 'calc(-200% - 4px)',
            left: 'calc(-100% - 2px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 32.06,
            number: 16,
            symbol: 'S',
            shells: [
                2,
                8,
                6
            ],
            oxidation_states: [
                '+6',
                '+4',
                '+2',
                '-2'
            ],
            top: 'calc(-100% - 2px)',
            left: 'calc(-100% - 2px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 78.9718,
            number: 34,
            symbol: 'Se',
            shells: [
                2,
                8,
                18,
                6
            ],
            oxidation_states: [
                '+6',
                '+4',
                '+2',
                '-2'
            ],
            top: '0%',
            left: 'calc(-100% - 2px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 127.603,
            number: 52,
            symbol: 'Te',
            shells: [
                2,
                8,
                18,
                18,
                6
            ],
            oxidation_states: [
                '+6',
                '+4',
                '+2',
                '-2'
            ],
            top: 'calc(100% + 2px)',
            left: 'calc(-100% - 2px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 209,
            number: 84,
            symbol: 'Po',
            shells: [
                2,
                8,
                18,
                32,
                18,
                6
            ],
            oxidation_states: [
                '+4',
                '+2',
                '-2'
            ],
            top: 'calc(200% + 4px)',
            left: 'calc(-100% - 2px)'
        },
        // group 15
        {
            target: 'elTable1',
            atomic_mass: 14.007,
            number: 7,
            symbol: 'N',
            shells: [
                2,
                5
            ],
            oxidation_states: [
                '+5',
                '+3',
                '-3'
            ],
            top: 'calc(-200% - 4px)',
            left: 'calc(-200% - 4px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 30.9737619985,
            number: 15,
            symbol: 'P',
            shells: [
                2,
                8,
                5
            ],
            oxidation_states: [
                '+5',
                '+3',
                '-3'
            ],
            top: 'calc(-100% - 2px)',
            left: 'calc(-200% - 4px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 74.9215956,
            number: 33,
            symbol: 'As',
            shells: [
                2,
                8,
                18,
                5
            ],
            oxidation_states: [
                '+5',
                '+3',
                '-3'
            ],
            top: '0%',
            left: 'calc(-200% - 4px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 121.7601,
            number: 51,
            symbol: 'Sb',
            shells: [
                2,
                8,
                18,
                18,
                5
            ],
            oxidation_states: [
                '+5',
                '+3',
                '-3'
            ],
            top: 'calc(100% + 2px)',
            left: 'calc(-200% - 4px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 208.980401,
            number: 83,
            symbol: 'Bi',
            shells: [
                2,
                8,
                18,
                32,
                18,
                5
            ],
            oxidation_states: [
                '+3'
            ],
            top: 'calc(200% + 4px)',
            left: 'calc(-200% - 4px)'
        },
        // group 14
        {
            target: 'elTable1',
            atomic_mass: 12.011,
            number: 6,
            symbol: 'C',
            shells: [
                2,
                4
            ],
            oxidation_states: [
                '+4',
                '-4'
            ],
            top: 'calc(-200% - 4px)',
            left: 'calc(-300% - 6px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 28.085,
            number: 14,
            symbol: 'Si',
            shells: [
                2,
                8,
                4
            ],
            oxidation_states: [
                '+4',
                '-4'
            ],
            top: 'calc(-100% - 2px)',
            left: 'calc(-300% - 6px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 72.6308,
            number: 32,
            symbol: 'Ge',
            shells: [
                2,
                8,
                18,
                4
            ],
            oxidation_states: [
                '+4',
                '-4'
            ],
            top: '0%',
            left: 'calc(-300% - 6px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 118.7107,
            number: 50,
            symbol: 'Sn',
            shells: [
                2,
                8,
                18,
                18,
                4
            ],
            oxidation_states: [
                '+4',
                '+2',
                '-4'
            ],
            top: 'calc(100% + 2px)',
            left: 'calc(-300% - 6px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 207.21,
            number: 82,
            symbol: 'Pb',
            shells: [
                2,
                8,
                18,
                32,
                18,
                4
            ],
            oxidation_states: [
                '+4',
                '+2'
            ],
            top: 'calc(200% + 4px)',
            left: 'calc(-300% - 6px)'
        },
        // group 13
        {
            target: 'elTable1',
            atomic_mass: 10.81,
            number: 5,
            symbol: 'B',
            shells: [
                2,
                3
            ],
            oxidation_states: [
                '+3'
            ],
            top: 'calc(-200% - 4px)',
            left: 'calc(-400% - 8px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 26.98153857,
            number: 13,
            symbol: 'Al',
            shells: [
                2,
                8,
                3
            ],
            oxidation_states: [
                '+3'
            ],
            top: 'calc(-100% - 2px)',
            left: 'calc(-400% - 8px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 69.7231,
            number: 31,
            symbol: 'Ga',
            shells: [
                2,
                8,
                18,
                3
            ],
            oxidation_states: [
                '+3'
            ],
            top: '0%',
            left: 'calc(-400% - 8px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 114.8181,
            number: 49,
            symbol: 'In',
            shells: [
                2,
                8,
                18,
                18,
                3
            ],
            oxidation_states: [
                '+3'
            ],
            top: 'calc(100% + 2px)',
            left: 'calc(-400% - 8px)'
        },
        {
            target: 'elTable1',
            atomic_mass: 204.38,
            number: 81,
            symbol: 'Tl',
            shells: [
                2,
                8,
                18,
                32,
                18,
                3
            ],
            oxidation_states: [
                '+3',
                '+1'
            ],
            top: 'calc(200% + 4px)',
            left: 'calc(-400% - 8px)'
        },
        // Ba Group 2
        {
            target: 'elTable2',
            atomic_mass: 137.3277,
            number: 56,
            symbol: 'Ba',
            shells: [
                2,
                8,
                18,
                18,
                8,
                2
            ],
            oxidation_states: [
                '+2'
            ],
            top: '0%',
            left: '0%'
        },
        {
            target: 'elTable2',
            atomic_mass: 226,
            number: 88,
            symbol: 'Ra',
            shells: [
                2,
                8,
                18,
                32,
                18,
                8,
                2
            ],
            oxidation_states: [
                '+2'
            ],
            top: 'calc(100% + 2px)',
            left: '0%'
        },
        {
            target: 'elTable2',
            atomic_mass: 87.621,
            number: 38,
            symbol: 'Sr',
            shells: [
                2,
                8,
                18,
                8,
                2
            ],
            oxidation_states: [
                '+2'
            ],
            top: 'calc(-100% - 2px)',
            left: '0%'
        },
        {
            target: 'elTable2',
            atomic_mass: 40.0784,
            number: 20,
            symbol: 'Ca',
            shells: [
                2,
                8,
                8,
                2
            ],
            oxidation_states: [
                '+2'
            ],
            top: 'calc(-200% - 4px)',
            left: '0%'
        },
        {
            target: 'elTable2',
            atomic_mass: 24.305,
            number: 12,
            symbol: 'Mg',
            shells: [
                2,
                8,
                2
            ],
            oxidation_states: [
                '+2'
            ],
            top: 'calc(-300% - 6px)',
            left: '0%'
        },
        {
            target: 'elTable2',
            atomic_mass: 9.01218315,
            number: 4,
            symbol: 'Be',
            shells: [
                2,
                2
            ],
            oxidation_states: [
                '+2'
            ],
            top: 'calc(-400% - 8px)',
            left: '0%'
        },
        // Ba Group 1
        {
            target: 'elTable2',
            atomic_mass: 6.94,
            number: 3,
            symbol: 'Li',
            shells: [
                2,
                1
            ],
            oxidation_states: [
                '+1'
            ],
            top: 'calc(-400% - 8px)',
            left: 'calc(-100% - 2px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 22.989769282,
            number: 11,
            symbol: 'Na',
            shells: [
                2,
                8,
                1
            ],
            oxidation_states: [
                '+1'
            ],
            top: 'calc(-300% - 6px)',
            left: 'calc(-100% - 2px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 39.09831,
            number: 19,
            symbol: 'K',
            shells: [
                2,
                8,
                8,
                2
            ],
            oxidation_states: [
                '+1'
            ],
            top: 'calc(-200% - 4px)',
            left: 'calc(-100% - 2px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 85.46783,
            number: 37,
            symbol: 'Rb',
            shells: [
                2,
                8,
                18,
                8,
                1
            ],
            oxidation_states: [
                '+1'
            ],
            top: 'calc(-100% - 2px)',
            left: 'calc(-100% - 2px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 132.905451966,
            number: 55,
            symbol: 'Cs',
            shells: [
                2,
                8,
                18,
                18,
                8,
                1
            ],
            oxidation_states: [
                '+1'
            ],
            top: '0%',
            left: 'calc(-100% - 2px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 6.94,
            number: 3,
            symbol: 'Li',
            shells: [
                2,
                1
            ],
            oxidation_states: [
                '+1'
            ],
            top: 'calc(-400% - 8px)',
            left: 'calc(-100% - 2px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 223,
            number: 87,
            symbol: 'Fr',
            shells: [
                2,
                8,
                18,
                32,
                18,
                8,
                1
            ],
            oxidation_states: [
                '+1'
            ],
            top: 'calc(100% + 2px)',
            left: 'calc(-100% - 2px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 1.008,
            number: 1,
            symbol: 'H',
            shells: [
                1
            ],
            oxidation_states: [
                '+1',
                '-1'
            ],
            top: 'calc(-500% - 10px)',
            left: 'calc(-100% - 2px)'
        },
        // Group 3
        {
            target: 'elTable2',
            atomic_mass: 44.9559085,
            number: 21,
            symbol: 'Sc',
            shells: [
                2,
                8,
                9,
                2
            ],
            oxidation_states: [
                '+3'
            ],
            top: 'calc(-200% - 4px)',
            left: 'calc(100% + 2px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 88.905842,
            number: 39,
            symbol: 'Y',
            shells: [
                2,
                8,
                18,
                9,
                2
            ],
            oxidation_states: [
                '+3'
            ],
            top: 'calc(-100% - 2px)',
            left: 'calc(100% + 2px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 174.96681,
            number: 71,
            symbol: 'Lu',
            shells: [
                2,
                8,
                18,
                32,
                9,
                2
            ],
            oxidation_states: [
                '+3'
            ],
            top: '0%',
            left: 'calc(100% + 2px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 266,
            number: 103,
            symbol: 'Lr',
            shells: [
                2,
                8,
                18,
                32,
                9,
                2
            ],
            oxidation_states: [
                '+3'
            ],
            top: 'calc(100% + 2px)',
            left: 'calc(100% + 2px)'
        },
        // Group 4
        {
            target: 'elTable2',
            atomic_mass: 47.8671,
            number: 22,
            symbol: 'Ti',
            shells: [
                2,
                8,
                10,
                2
            ],
            oxidation_states: [
                '+4'
            ],
            top: 'calc(-200% - 4px)',
            left: 'calc(200% + 4px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 91.2242,
            number: 40,
            symbol: 'Zr',
            shells: [
                2,
                8,
                18,
                10,
                2
            ],
            oxidation_states: [
                '+4'
            ],
            top: 'calc(-100% - 2px)',
            left: 'calc(200% + 4px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 178.492,
            number: 72,
            symbol: 'Hf',
            shells: [
                2,
                8,
                18,
                32,
                10,
                2
            ],
            oxidation_states: [
                '+4'
            ],
            top: '0%',
            left: 'calc(200% + 4px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 267,
            number: 104,
            symbol: 'Rf',
            shells: [
                2,
                8,
                18,
                32,
                32,
                10,
                2
            ],
            oxidation_states: [
                '+4'
            ],
            top: 'calc(100% + 2px)',
            left: 'calc(200% + 4px)'
        },
        // Group 5
        {
            target: 'elTable2',
            atomic_mass: 50.94151,
            number: 23,
            symbol: 'V',
            shells: [
                2,
                8,
                11,
                2
            ],
            oxidation_states: [
                '+5'
            ],
            top: 'calc(-200% - 4px)',
            left: 'calc(300% + 6px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 92.906372,
            number: 41,
            symbol: 'Nb',
            shells: [
                2,
                8,
                18,
                12,
                1
            ],
            oxidation_states: [
                '+5'
            ],
            top: 'calc(-100% - 2px)',
            left: 'calc(300% + 6px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 180.947882,
            number: 73,
            symbol: 'Ta',
            shells: [
                2,
                8,
                18,
                32,
                11,
                2
            ],
            oxidation_states: [
                '+5'
            ],
            top: '0%',
            left: 'calc(300% + 6px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 268,
            number: 105,
            symbol: 'Db',
            shells: [
                2,
                8,
                18,
                32,
                32,
                11,
                2
            ],
            oxidation_states: [
                '+5'
            ],
            top: 'calc(100% + 2px)',
            left: 'calc(300% + 6px)'
        },
        // Group 6
        {
            target: 'elTable2',
            atomic_mass: 51.99616,
            number: 24,
            symbol: 'Cr',
            shells: [
                2,
                8,
                13,
                1
            ],
            oxidation_states: [
                '+6',
                '+3'
            ],
            top: 'calc(-200% - 4px)',
            left: 'calc(400% + 8px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 95.951,
            number: 42,
            symbol: 'Mo',
            shells: [
                2,
                8,
                18,
                13,
                1
            ],
            oxidation_states: [
                '+6',
                '+4'
            ],
            top: 'calc(-100% - 2px)',
            left: 'calc(400% + 8px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 183.841,
            number: 74,
            symbol: 'W',
            shells: [
                2,
                8,
                18,
                32,
                12,
                2
            ],
            oxidation_states: [
                '+6',
                '+4'
            ],
            top: '0%',
            left: 'calc(400% + 8px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 269,
            number: 106,
            symbol: 'Sg',
            shells: [
                2,
                8,
                18,
                32,
                32,
                12,
                2
            ],
            oxidation_states: [
                '+6'
            ],
            top: 'calc(100% + 2px)',
            left: 'calc(400% + 8px)'
        },
        // Group 7
        {
            target: 'elTable2',
            atomic_mass: 54.9380443,
            number: 25,
            symbol: 'Mn',
            shells: [
                2,
                8,
                13,
                2
            ],
            oxidation_states: [
                '+7',
                '+4',
                '+2'
            ],
            top: 'calc(-200% - 4px)',
            left: 'calc(500% + 10px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 98,
            number: 43,
            symbol: 'Tc',
            shells: [
                2,
                8,
                18,
                13,
                2
            ],
            oxidation_states: [
                '+7',
                '+4'
            ],
            top: 'calc(-100% - 2px)',
            left: 'calc(500% + 10px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 186.2071,
            number: 75,
            symbol: 'Re',
            shells: [
                2,
                8,
                18,
                32,
                13,
                2
            ],
            oxidation_states: [
                '+7',
                '+4'
            ],
            top: '0%',
            left: 'calc(500% + 10px)'
        },
        {
            target: 'elTable2',
            atomic_mass: 270,
            number: 107,
            symbol: 'Bh',
            shells: [
                2,
                8,
                18,
                32,
                32,
                13,
                2
            ],
            oxidation_states: [
                '+7'
            ],
            top: 'calc(100% + 2px)',
            left: 'calc(500% + 10px)'
        }
    ],
    toggleFullScreen: function(elem) {
        const elDoc = document.documentElement;
        if (!document.fullscreenElement) {
            if (elDoc.requestFullscreen) {
                elDoc.requestFullscreen();
            } else if (elDoc.msRequestFullscreen) {
                elDoc.msRequestFullscreen();
            } else if (elDoc.mozRequestFullScreen) {
                elDoc.mozRequestFullScreen();
            } else if (elDoc.webkitRequestFullscreen) {
                elDoc.webkitRequestFullscreen();
            }
            elem.innerHTML = `Exit <span class="c-secondary-100">F</span>ullsreen`;
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                elem.innerHTML = `Enter full<span class="c-secondary-100">Sc</span>reen`;
            }
        }
    },
    templates: {
        singleElement: function({atomic_mass, symbol, number, shells, oxidation_states, top, left}) {
            return `
                <span class="d-flex | pos-absolute top-0 left-0 | p-8 ar-1 | outl-1"
                    p-7="xs"
                    style="top: ${top}; left: ${left}">
                    <span class="d-flex jc-space-between | pos-absolute top-0 left-0 | w-100 p-1">
                        <code class="ff-400 fs-1">${atomic_mass}</code>
                        <code class="maxw-2ch | ff-400 fs-1">${oxidation_states}</code>
                    </span>
                    <span class="d-flex fd-column | pos-absolute bottom-0 left-0 | p-1 | fs-2">
                        <span class="d-flex fd-column">
                            <code class="ff-700">${number}</code>
                            <code class="ff-400 fs-1">${shells}</code>
                        </span>
                    </span>
                    <span class="pos-absolute top-50 left-50 t-tY-50 t-tX-50 | mt-offset-1 | ff-700 fs-8 ta-center" fs-7="xs">${symbol}</span>
                </span>
            `;
        }
    },
    run: function() {
        bb.data.forEach(element => {
            bb[element.target].innerHTML += bb.templates.singleElement({
                atomic_mass: element.atomic_mass,
                symbol: element.symbol,
                number: element.number,
                shells: element.shells.toString().replaceAll(',', '-'),
                oxidation_states: element.oxidation_states.toString().replaceAll(',', ' '),
                top: element.top,
                left: element.left
            })
        });
        window.addEventListener('scroll', bb.handlers.formulaes);
    },
    getCurrentScrollTrackPosition: function() {
        return 100 * window.scrollY / (document.body.clientHeight - window.innerHeight);
    },
    handlers: {
        formulaes: function() {
            if (bb.getCurrentScrollTrackPosition() > 12) {
                bb.elFormulaes.classList.add('__stop_animations');
            } else {
                bb.elFormulaes.classList.remove('__stop_animations');
            }
        }
    }
}
bb.run();