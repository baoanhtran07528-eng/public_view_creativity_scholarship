import * as THREE from 'https://esm.sh/three@0.150.1';
import { GLTFLoader } from 'https://esm.sh/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'https://esm.sh/three@0.150.1/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'https://esm.sh/three@0.150.1/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://esm.sh/three@0.150.1/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://esm.sh/three@0.150.1/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Reflector } from 'https://esm.sh/three@0.150.1/examples/jsm/objects/Reflector.js';

// === CURSOR TRACKING (Works everywhere immediately) ===
const cursor = document.getElementById("blobCursor");
if (cursor) {
    document.addEventListener("mousemove", (e) => {
        cursor.style.transform = `translate3d(${e.clientX - 11}px, ${e.clientY - 11}px, 0)`;
    }, false);
    console.log("✓ Cursor tracking active");
}

// === CURSOR CLICK ANIMATION (Works everywhere) ===
if (cursor) {
    document.addEventListener("mousedown", () => {
        cursor.classList.add('is-clicked');
    }, false);
    
    document.addEventListener("mouseup", () => {
        cursor.classList.remove('is-clicked');
    }, false);
    console.log("✓ Click animation active");
}

// === Check if we're on the cinema page (motion.html) ===
// === PROJECT PAGE DETECTION MATRIX ===
const isCinemaPage = document.getElementById("cinemaContainer") !== null;
// Add detectors for your other pages if they share this file (or check their specific unique elements)
const isInStasisPage = document.body.classList.contains("stasis-body") || window.location.pathname.includes("stasis");
const isDialoguePage = window.location.pathname.includes("dialogue");
const isOriginPage   = window.location.pathname.includes("origin");

if (isCinemaPage) {
    console.log("✓ 'In Motion' detected.");
    // If we haven't advanced past this step yet, bump to step 4
    if (!sessionStorage.getItem('tutorialProgress') || sessionStorage.getItem('tutorialProgress') === '3') {
        sessionStorage.setItem('tutorialProgress', '4'); 
    }
} else if (isInStasisPage) {
    console.log("✓ 'In Stasis' detected.");
    if (sessionStorage.getItem('tutorialProgress') === '4') {
        sessionStorage.setItem('tutorialProgress', '5');
    }
} else if (isDialoguePage) {
    console.log("✓ 'The Dialogue' detected.");
    if (sessionStorage.getItem('tutorialProgress') === '5') {
        sessionStorage.setItem('tutorialProgress', '6');
    }
} else if (isOriginPage) {
    console.log("✓ 'The Origin' detected.");
    if (sessionStorage.getItem('tutorialProgress') === '6') {
        sessionStorage.setItem('tutorialProgress', '7'); // Complete!
    }
}

// === THREE.JS INITIALIZATION (index.html only) ===
if (!isCinemaPage) {

// --- ASSET LOADING MANAGER WITH FORCED LINGER & SMOOTHED PROGRESS ---
const heartbeatAudio = new Audio('heartbeat.mp3'); 
heartbeatAudio.preload = 'auto';

function playHeartbeatSound(volume = 1.0) {
    // 1. Check if audio exists, or if the user muted it via the new menu checkbox
    if (!heartbeatAudio || isHeartbeatMuted) return;
    
    heartbeatAudio.currentTime = 0; 
    
    // 2. Multiply the core sound intensity by your new settings slider value
    heartbeatAudio.volume = volume * heartbeatVolume;
    
    heartbeatAudio.play().catch(err => {
        console.log("Audio waiting for user layout interaction.");
    });
}

const loadingScreen = document.getElementById('loadingScreen');
const loaderBar = document.getElementById('loaderBar');
const loaderStatus = document.getElementById('loaderStatus');
const portfolioCoverScreen = document.getElementById('portfolioCoverScreen');
let isLoaderVisualActive = !portfolioCoverScreen;
let queuedRawTargetPercent = 0;
let latestItemsLoaded = 0;
let latestItemsTotal = 0;

function animateLoaderProgress(targetPercent) {
    function smoothStepProgress() {
        if (currentVisualProgress < targetPercent) {
            currentVisualProgress += (targetPercent - currentVisualProgress) * 0.15;
            if (loaderBar) loaderBar.style.width = `${currentVisualProgress}%`;

            if (targetPercent - currentVisualProgress > 0.5) {
                requestAnimationFrame(smoothStepProgress);
                return;
            }
        }

        currentVisualProgress = targetPercent;
        if (loaderBar) loaderBar.style.width = `${currentVisualProgress}%`;

        if (currentVisualProgress >= 100) {
            const clickPrompt = document.getElementById('clickPrompt');
            if (clickPrompt) {
                clickPrompt.style.opacity = "0.6";
            }
            if (loaderStatus) {
                loaderStatus.innerText = `RECONSTRUCTION COMPLETE`;
            }
        }
    }

    requestAnimationFrame(smoothStepProgress);
}

if (portfolioCoverScreen) {
    const COVER_HOLD_MS = 4000;
    const COVER_FADE_MS = 900;

    window.setTimeout(() => {
        portfolioCoverScreen.classList.add('fade-out');

        window.setTimeout(() => {
            portfolioCoverScreen.classList.add('is-hidden');
            document.body.classList.remove('precover-active');
            isLoaderVisualActive = true;
            animateLoaderProgress(queuedRawTargetPercent);
            if (loaderStatus && latestItemsTotal > 0 && queuedRawTargetPercent < 100) {
                loaderStatus.innerText = `FETCHING NODE: ${latestItemsLoaded}/${latestItemsTotal}`;
            }
        }, COVER_FADE_MS);
    }, COVER_HOLD_MS);
}

const startTime = performance.now();
const MINIMUM_LINGER_MS = 2500; 

const loadingManager = new THREE.LoadingManager();
let currentVisualProgress = 0;

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    const rawTargetPercent = (itemsLoaded / itemsTotal) * 100;
    latestItemsLoaded = itemsLoaded;
    latestItemsTotal = itemsTotal;
    queuedRawTargetPercent = Math.max(queuedRawTargetPercent, rawTargetPercent);

    if (!isLoaderVisualActive) return;

    animateLoaderProgress(rawTargetPercent);
    if (loaderStatus) loaderStatus.innerText = `FETCHING NODE: ${itemsLoaded}/${itemsTotal}`;
};

loadingManager.onLoad = () => {
    // Make the entire loading screen wrapper listen for the entry click
    if (loadingScreen) {
        const handleEntryClick = (e) => {
            // Safety check: Only allow entry if the visual progress is actually at 100%
            if (currentVisualProgress < 100) return;

            // 1. Unmute and activate the ambient soundtrack
            if (ytPlayer && typeof ytPlayer.unMute === 'function') {
                ytPlayer.unMute();
                ytPlayer.setVolume(70); 
                isAudioPlaying = true;
                
                const audioToggleBtn = document.getElementById('audioToggleBtn');
                const audioStatusText = audioToggleBtn ? audioToggleBtn.querySelector('.audio-status-text') : null;
                if (audioToggleBtn && audioStatusText) {
                    audioToggleBtn.classList.add('is-active');
                    audioStatusText.innerText = "AUDIO: ACTIVE";
                }
            }
            
            // 2. Play the first heartbeat thump right on the click transition
            playHeartbeatSound(1.0);

            // 3. Fade away the loading screen container
            loadingScreen.classList.add('loaded');

            // 4. Clean up this listener
            loadingScreen.removeEventListener('click', handleEntryClick);
        };

        loadingScreen.addEventListener('click', handleEntryClick);
    }
};

// --- SCENE & CAMERA SETUP ---
const scene = new THREE.Scene();
const voidBlue = 0x010204; 
scene.background = new THREE.Color(voidBlue);
scene.fog = new THREE.FogExp2(voidBlue, 0.035); 

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
const camBase = new THREE.Vector3(12.0, -1.0, -5.0); 
camera.position.copy(camBase);

const cameraTarget = new THREE.Vector3(-1, 5, 5);
const defaultLookAt = new THREE.Vector3(-1, 5, 5);
const menuLookAt = new THREE.Vector3(0, 9.3, 5.0);

const CHARACTER_LAYER = 1;
camera.layers.enable(CHARACTER_LAYER);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2; 
document.body.appendChild(renderer.domElement);

const loader = new GLTFLoader(loadingManager);
const texLoader = new THREE.TextureLoader(loadingManager);
const rgbeLoader = new RGBELoader(loadingManager);

// --- FLUID SKY BACKGROUND ---
const fluidTexture = texLoader.load('image_ebdf3b.jpg'); 
fluidTexture.wrapS = fluidTexture.wrapT = THREE.MirroredRepeatWrapping;

const bgMaterial = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.NormalBlending, 
    depthWrite: false, 
    uniforms: {
        tDiffuse: { value: fluidTexture },
        time: { value: 0 },
        opacity: { value: 0.08 } 
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform float opacity;
        varying vec2 vUv;
        void main() {
            vec2 uv = vUv * vec2(0.5, 0.5); 
            uv.x += time * 0.005;
            uv.y += sin(uv.x * 3.0 + time * 0.02) * 0.05;
            vec4 tex = texture2D(tDiffuse, uv);
            float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
            vec3 darkTint = vec3(0.002, 0.005, 0.01);
            vec3 finalColor = mix(darkTint, tex.rgb * 0.18, pow(luma, 2.0));
            float poleFade = smoothstep(0.0, 0.4, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
            float sideFade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
            gl_FragColor = vec4(finalColor, luma * opacity * poleFade * sideFade);
        }
    `
});
const bgMesh = new THREE.Mesh(new THREE.SphereGeometry(250, 64, 64), bgMaterial);
scene.add(bgMesh);

// --- VOLUMETRIC LIGHTS ---
scene.add(new THREE.AmbientLight(0x221111, 0.4));
const coreLight = new THREE.PointLight(0xff4400, 45, 60);
scene.add(coreLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
rimLight.position.set(0, 5, -10); 
rimLight.layers.set(CHARACTER_LAYER); 
camera.add(rimLight);
scene.add(camera);

rgbeLoader.load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr', (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = tex;
});

// --- GLASS PHYSICAL MATERIAL ---
const crystalMat = new THREE.MeshPhysicalMaterial({
    color: 0xff0000, 
    transmission: 1.0,
    ior: 1.52,
    roughness: 0.01,
    thickness: 2.5,
    attenuationColor: 0x440000,
    attenuationDistance: 0.5,
    dispersion: 0.5,
    clearcoat: 1.0,
    transparent: true,
    side: THREE.DoubleSide
});

const heartGroup = new THREE.Group();
heartGroup.position.set(0, 9, 5); 
scene.add(heartGroup);

let outerModel, innerModel, baseScale = 1.0;
const coreRotationAxis = new THREE.Vector3();

loader.load('heart.glb', (gltf) => {
    outerModel = gltf.scene;
    const box = new THREE.Box3().setFromObject(outerModel);
    baseScale = 14 / box.getSize(new THREE.Vector3()).y;
    outerModel.scale.set(baseScale, baseScale, baseScale);
    outerModel.position.sub(box.getCenter(new THREE.Vector3()).multiplyScalar(baseScale));
    outerModel.traverse(c => { if (c.isMesh) { c.material = crystalMat; c.material.envMapIntensity = 1.5; } });
    
    innerModel = outerModel.clone();
    innerModel.scale.set(baseScale * 0.35, baseScale * 0.35, baseScale * 0.35); 
    innerModel.traverse(c => { 
        if (c.isMesh) c.material = new THREE.MeshStandardMaterial({ 
            color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 12.0, roughness: 0.2
        }); 
    });
    heartGroup.add(outerModel, innerModel);
    coreRotationAxis.randomDirection();
});

// --- TITLE LAYER WITH ARIAL BLACK ---
const titleCanvas = document.createElement('canvas');
titleCanvas.width = 2048;
titleCanvas.height = 512;
const titleCtx = titleCanvas.getContext('2d');

titleCtx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);
titleCtx.textAlign = 'center';
titleCtx.textBaseline = 'middle';

titleCtx.font = '900 110px "Arial Black", Gadget, sans-serif';
titleCtx.fillStyle = '#ffffff';
titleCtx.letterSpacing = "12px";
titleCtx.fillText("WHAT WAS ALWAYS THERE", titleCanvas.width / 2, titleCanvas.height / 2);

const titleTexture = new THREE.CanvasTexture(titleCanvas);
titleTexture.encoding = THREE.sRGBEncoding;
titleTexture.wrapS = THREE.ClampToEdgeWrapping;
titleTexture.wrapT = THREE.ClampToEdgeWrapping;

const titleMaterial = new THREE.MeshBasicMaterial({
    map: titleTexture,
    transparent: true,
    opacity: 0.3,      
    depthWrite: false,
    side: THREE.DoubleSide
});

const titlePlaneGeo = new THREE.PlaneGeometry(120, 250); 
const titleMesh = new THREE.Mesh(titlePlaneGeo, titleMaterial);

camera.add(titleMesh); 
titleMesh.position.set(0, 4.0, -45); 
titleMesh.renderOrder = -1; 

// --- INSTANCED GLASS SHARDS ---
const MAX_SHARDS = 200; 
const shardGeo = new THREE.ConeGeometry(0.15, 0.5, 3); 
const shardMesh = new THREE.InstancedMesh(shardGeo, crystalMat, MAX_SHARDS);
shardMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(shardMesh);

const shardsData = [];
let shardPoolIndex = 0;
let shardTimeScale = 1.0; 

const dummy = new THREE.Object3D();
const PRE_WARM_COUNT = 90; 

for (let i = 0; i < PRE_WARM_COUNT; i++) {
    const floatDrift = new THREE.Vector3(
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 1.2
    );
    const spin = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
    );
    const sparkles = Math.random() < 0.4;

    shardsData[i] = {
        position: new THREE.Vector3((Math.random() - 0.5) * 60, Math.random() * 10 + 5, (Math.random() - 0.5) * 60),
        velocity: floatDrift.clone(), 
        floatDrift: floatDrift,
        rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        spin: spin,
        scale: Math.random() * 0.6 + 0.3,
        twinkleSpeed: sparkles ? (Math.random() * 3.5 + 1.5) : 0, 
        twinklePhase: Math.random() * Math.PI * 2,
        isEvicting: false
    };

    dummy.position.copy(shardsData[i].position);
    dummy.rotation.copy(shardsData[i].rotation);
    dummy.scale.setScalar(shardsData[i].scale);
    dummy.updateMatrix();
    shardMesh.setMatrixAt(i, dummy.matrix);
}

dummy.position.set(0, -50, 0);
dummy.scale.setScalar(0);
dummy.updateMatrix();
for (let i = PRE_WARM_COUNT; i < MAX_SHARDS; i++) {
    shardMesh.setMatrixAt(i, dummy.matrix);
}
shardMesh.instanceMatrix.needsUpdate = true;
shardPoolIndex = PRE_WARM_COUNT; 

function spawnShardBurst(count) {
    if (isMenuMode) return;

    const origin = new THREE.Vector3();
    heartGroup.getWorldPosition(origin);
    const d = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
        const index = shardPoolIndex;
        
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 14,  
            (Math.random() - 0.5) * 1.5, 
            (Math.random() - 0.5) * 14   
        );
        const floatDrift = new THREE.Vector3(
            (Math.random() - 0.5) * 1.2,
            (Math.random() - 0.5) * 0.15, 
            (Math.random() - 0.5) * 1.2
        );
        const spin = new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02, 
            (Math.random() - 0.5) * 0.02
        );
        const sparkles = Math.random() < 0.4;

        shardsData[index] = {
            position: origin.clone(),
            velocity: velocity,
            floatDrift: floatDrift,
            rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
            spin: spin,
            scale: Math.random() * 0.6 + 0.3,
            twinkleSpeed: sparkles ? (Math.random() * 4.0 + 2.0) : 0, 
            twinklePhase: Math.random() * Math.PI * 2,
            isEvicting: false
        };

        const oldIndex = (shardPoolIndex + count) % MAX_SHARDS;
        if (shardsData[oldIndex]) {
            shardsData[oldIndex].isEvicting = true;
        }

        d.position.copy(shardsData[index].position);
        d.scale.setScalar(shardsData[index].scale);
        d.updateMatrix();
        shardMesh.setMatrixAt(index, d.matrix);

        shardPoolIndex = (shardPoolIndex + 1) % MAX_SHARDS;
    }
    shardMesh.instanceMatrix.needsUpdate = true;
}

// --- SILHOUETTE CHARACTERS ---
let headL = new THREE.Group();
let headR = new THREE.Group();
const personGroupL = new THREE.Group();
const personGroupR = new THREE.Group();

function createPerson(groupRef, x, z, eyeCol) {
    groupRef.position.set(x, -0.9, z);
    
    const headPivot = new THREE.Group();
    headPivot.position.y = 1.35; 
    groupRef.add(headPivot);

    const placeholderMat = new THREE.MeshStandardMaterial({ color: 0x010101, roughness: 1.0 });
    const tempBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.5), placeholderMat);
    const tempHead = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), placeholderMat);
    
    groupRef.add(tempBody);
    headPivot.add(tempHead);

    loader.load('LowPolyBody.glb', (gltf) => {
        const bodyModel = gltf.scene;
        bodyModel.scale.setScalar(3);   
        bodyModel.position.y = -4.3;   
        bodyModel.rotation.y = (x === 0) ? Math.PI * 1.15 : Math.PI * 1.85;
        
        bodyModel.traverse(c => { 
            if (c.isMesh) {
                c.layers.enable(CHARACTER_LAYER);
                if(c.material.emissive) c.material.emissive.setHex(0x000000); 
                c.material.roughness = 0.98;         
                c.material.metalness = 0.0; 
                c.material.envMapIntensity = 0.02;   
            } 
        });
        groupRef.remove(tempBody);
        groupRef.add(bodyModel);
    });

    loader.load('BoxHead.glb', (gltf) => {
        const headModel = gltf.scene;
        headModel.scale.setScalar(0.65); 
        headModel.traverse(c => { 
            if (c.isMesh) {
                c.layers.enable(CHARACTER_LAYER);
                c.material = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.98, metalness: 0.0, envMapIntensity: 0.02 });
            } 
        });
        
        const eyeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.01, 32); 
        const eyeMat = new THREE.MeshBasicMaterial({ color: eyeCol });
        const e1 = new THREE.Mesh(eyeGeo, eyeMat);
        e1.rotation.x = Math.PI / 2; e1.position.set(0.15, 0.08, 0.38); 
        const e2 = e1.clone(); e2.position.x = -0.15;
        
        headModel.add(e1, e2);
        headPivot.remove(tempHead);
        headPivot.add(headModel);
    });

    groupRef.traverse(c => { if (c.isMesh) c.layers.enable(CHARACTER_LAYER); });
    scene.add(groupRef);
    return headPivot; 
}

headL = createPerson(personGroupL, 0, 20, 0xff3300);
headR = createPerson(personGroupR, 9, -5, 0xffcc00);

// --- SHADER WATER REFLECTOR ---
const mirror = new Reflector(new THREE.PlaneGeometry(200, 200), {
    textureWidth: innerWidth * devicePixelRatio, textureHeight: innerHeight * devicePixelRatio, color: 0x330000 
});

const waterMaterial = new THREE.ShaderMaterial({
    transparent: true, 
    uniforms: { 
        time: { value: 0 }, 
        tDiffuse: { value: mirror.getRenderTarget().texture },
        posPersonL: { value: new THREE.Vector2(0, 20) },
        posPersonR: { value: new THREE.Vector2(9, -5) }
    },
    vertexShader: `
        varying vec2 vUv; varying vec4 vRef; varying float vH; uniform float time;
        uniform vec2 posPersonL; uniform vec2 posPersonR; varying vec3 vWorldPos;
        void main() {
            vUv = uv; vec3 p = position;
            float w = sin(p.x * 0.4 + time * 0.6) * 0.25 + cos(p.y * 0.3 + time * 0.3) * 0.15;
            vec4 worldPos = modelMatrix * vec4(position, 1.0); vWorldPos = worldPos.xyz;
            float distL = distance(worldPos.xz, posPersonL);
            if(distL < 6.0) w += sin(distL * 4.0 - time * 4.0) * 0.06 * smoothstep(6.0, 0.0, distL);
            float distR = distance(worldPos.xz, posPersonR);
            if(distR < 6.0) w += sin(distR * 4.0 - time * 4.0) * 0.06 * smoothstep(6.0, 0.0, distR);
            p.z += w; vH = w;
            vec4 mv = modelViewMatrix * vec4(p, 1.0); vRef = projectionMatrix * mv;
            gl_Position = projectionMatrix * mv;
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse; uniform float time; 
        varying vec2 vUv; varying vec4 vRef; varying float vH; varying vec3 vWorldPos;
        uniform vec2 posPersonL; uniform vec2 posPersonR;
        float noise(vec2 p) { return fract(sin(dot(p, vec2(12.98, 78.23))) * 43758.54); }
        void main() {
            vec2 uv = (vRef.xy / vRef.w) * 0.5 + 0.5;
            vec3 rawRef = texture2D(tDiffuse, uv + vH * 0.02).rgb;
            vec3 deepWineRed = vec3(0.25, 0.0, 0.02);
            float refLuma = dot(rawRef, vec3(0.299, 0.587, 0.114));
            vec3 brightReflect = mix(rawRef, vec3(1.3), smoothstep(0.2, 0.6, refLuma));
            vec3 ref = mix(deepWineRed, brightReflect, smoothstep(0.04, 0.18, refLuma));
            vec3 voidBase = vec3(0.01, 0.005, 0.01), bloodCrimson = vec3(0.6, 0.0, 0.05); 
            vec3 emberOrange = vec3(0.8, 0.25, 0.0), darkMutedGold = vec3(0.75, 0.45, 0.05);
            float movingUvX = vUv.x * 120.0 + sin(vUv.y * 2.0 + time * 0.5) * 10.0;
            float lineMask = smoothstep(0.1, 0.9, sin(movingUvX + time * 1.5));
            vec3 base = mix(voidBase, bloodCrimson, vH + 0.45);
            base = mix(base, emberOrange, lineMask * 0.20); 
            base = mix(base, darkMutedGold, smoothstep(0.12, 0.4, vH) * 0.12); 
            float dL = distance(vWorldPos.xz, posPersonL);
            if (dL < 5.0) base += vec3(0.15, 0.02, 0.0) * max(0.0, sin(dL * 4.0 - time * 4.0) * smoothstep(5.0, 0.0, dL));
            float dR = distance(vWorldPos.xz, posPersonR);
            if (dR < 5.0) base += vec3(0.12, 0.08, 0.0) * max(0.0, sin(dR * 4.0 - time * 4.0) * smoothstep(5.0, 0.0, dR));
            vec3 finalCol = mix(base, ref, 0.32) + noise(vUv * 500.0 + mod(time, 3.0)) * 0.03;
            gl_FragColor = vec4(finalCol, smoothstep(0.5, 0.35, distance(vUv, vec2(0.5))));
        }
    `
});
const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(200, 200, 128, 128), waterMaterial);
waterMesh.rotation.x = -Math.PI / 2; waterMesh.position.y = -1.5;
scene.add(waterMesh, mirror); mirror.visible = false;

// --- GLOW POST PIPELINE ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 2.4, 1.3, 0.1));

// --- MOUSE TRACKING & STRUCTURAL INTERACTIONS ---
const mouse = new THREE.Vector2();
const ray = new THREE.Raycaster();
let drag = false, rx = 0, ry = 0, isHovered = false, hoverScaleLerp = 0;     
const curL = new THREE.Vector3(), curM = new THREE.Vector3(), curH = new THREE.Vector3();

let isMenuMode = false, lastClickTime = 0;
let clickResetTimeout = null;
const menuContainer = document.getElementById('heartMenu');

function getRequiredTutorialAction() {
    const tutorialStep = parseInt(sessionStorage.getItem('tutorialProgress') || '0');
    if (tutorialStep === 2) return 'heart';
    if (tutorialStep === 3) return 'motion';
    if (tutorialStep === 4) return 'stasis';
    if (tutorialStep === 5) return 'dialogue';
    if (tutorialStep === 6) return 'origin';
    return null;
}

function isTutorialInteractionAllowed(action) {
    const tutorialStep = parseInt(sessionStorage.getItem('tutorialProgress') || '0');
    if (tutorialStep >= 8) return true;
    if (tutorialStep === 7 && action === 'heart') return true;
    const requiredAction = getRequiredTutorialAction();
    if (tutorialStep < 2) return false;
    return !requiredAction || requiredAction === action;
}

function isTutorialMenuLocked() {
    const tutorialStep = parseInt(sessionStorage.getItem('tutorialProgress') || '0');
    const tutorialContainer = document.getElementById('tutorialDialogueContainer');
    return tutorialStep < 7 && Boolean(tutorialContainer);
}

function shouldAutoOpenTutorialMenu() {
    const tutorialStep = parseInt(sessionStorage.getItem('tutorialProgress') || '0');
    return tutorialStep >= 2 && tutorialStep < 8;
}

window.handleTutorialMenuClose = function() {
    const tutorialStep = parseInt(sessionStorage.getItem('tutorialProgress') || '0');
    if (tutorialStep !== 7) return;
    sessionStorage.setItem('tutorialProgress', '8');
    const dialog = document.getElementById('tutorialDialogueContainer');
    if (dialog) dialog.remove();
};

if (menuContainer) {
    // Prevent text selection from triggering on fast clicks
    menuContainer.addEventListener('selectstart', (e) => {
        e.preventDefault();
    });

    // Prevent default mobile/desktop context menus on long-press or fast double taps
    menuContainer.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}
const menuItems = document.querySelectorAll('.menu-item');
const promptBox = document.getElementById('promptBox');
const menuCamTarget = new THREE.Vector3(8.2, 1.1, -6.5); 

const blobElement = document.getElementById('blobCursor');
const trailPolygonElement = document.getElementById('glowingTrailPolygon');
const targetMousePos = { x: 0, y: 0 }, currentBlobPos = { x: 0, y: 0 };
let hasMovedMouse = false;
const pointsHistory = [];
const MAX_TRAIL_POINTS = 16; 
let trailOpacity = 1.0; 

// Track cursor box click stages
let promptBoxActive = false;

window.addEventListener('mousemove', (e) => {
    const ox = mouse.x, oy = mouse.y;
    mouse.x = (e.clientX / innerWidth) * 2 - 1; 
    mouse.y = -(e.clientY / innerHeight) * 2 + 1;
    if (drag) { ry += (mouse.x - ox) * 2.5; rx += (mouse.y - oy) * 2.5; }

    targetMousePos.x = e.clientX; targetMousePos.y = e.clientY;
    if (!hasMovedMouse) { currentBlobPos.x = targetMousePos.x; currentBlobPos.y = targetMousePos.y; hasMovedMouse = true; }

    if (outerModel) {
        ray.setFromCamera(mouse, camera);
        isHovered = ray.intersectObject(heartGroup, true).length > 0;
        
        // Hide box if mouse leaves the heart model entirely
        if (!isHovered && promptBoxActive) {
            if (promptBox) promptBox.classList.remove('visible');
            promptBoxActive = false;
            if (clickResetTimeout) {
                clearTimeout(clickResetTimeout);
                clickResetTimeout = null;
            }
        }

        if (blobElement) {
            if (isHovered) blobElement.classList.add('is-darkened');
            else blobElement.classList.remove('is-darkened');
        }
    }
});

window.addEventListener('mousedown', () => { 
    ray.setFromCamera(mouse, camera); 

    const isHeartClick = ray.intersectObject(heartGroup, true).length > 0;
    if (isHeartClick && !isTutorialInteractionAllowed('heart')) {
        return;
    }
    
    if (isHeartClick) {
        const currentTime = performance.now();
        const timeDiff = currentTime - lastClickTime;
        
        if (timeDiff < 800) {
            // SUCCESSFUL SECOND CLICK (Triggers open OR close transition)
            if (clickResetTimeout) {
                clearTimeout(clickResetTimeout);
                clickResetTimeout = null;
            }

            if (promptBox) {
                promptBox.innerText = isMenuMode ? "exit!" : "open!";
                promptBox.classList.add('success');
                
                setTimeout(() => {
                    promptBox.classList.remove('visible');
                    promptBoxActive = false;
                }, 900);
            }
            if (isTutorialMenuLocked() && isMenuMode) {
                lastClickTime = 0;
                return;
            }
            toggleHeartMenu();
            lastClickTime = 0; 
        } else {
            // FIRST CLICK
            if (clickResetTimeout) clearTimeout(clickResetTimeout);

            if (promptBox) {
                promptBox.innerText = isMenuMode ? "exit?" : "open?";
                promptBox.classList.remove('success');
                promptBox.classList.add('visible');
                promptBoxActive = true;
            }

            // Only rotate model when menu is closed
            if (!isMenuMode) {
                drag = true;
            }

            // Stale check: hide prompt box if no secondary click falls within the window
            clickResetTimeout = setTimeout(() => {
                if (promptBoxActive) {
                    if (promptBox) promptBox.classList.remove('visible');
                    promptBoxActive = false;
                }
                clickResetTimeout = null;
            }, 800);

            lastClickTime = currentTime;
        }
    }
});

window.addEventListener('mouseup', () => {
    drag = false;
});

function toggleHeartMenu() {
    isMenuMode = !isMenuMode;
    drag = false; 
    
    if (isMenuMode) {
        menuContainer.classList.add('active-menu');
        
        // --- ADD THIS LINE HERE TO UNBLOCK THE TUTORIAL ---
        if (typeof window.triggerTutorialMenuPhase === 'function') {
            window.triggerTutorialMenuPhase();
        }
        // -------------------------------------------------

        const trackPlacements = ['32%', '68%', '32%', '68%'];
        
        menuItems.forEach((item, index) => {
            const pathText = item.querySelector('textPath');
            if (pathText) {
                pathText.setAttribute('startOffset', trackPlacements[index]);
                pathText.setAttribute('text-anchor', 'middle'); 
            }
            item.style.transform = `scale(1.05)`;
        });
    } else {
        menuContainer.classList.remove('active-menu');
        menuItems.forEach(item => {
            item.style.transform = `scale(0.5)`;
        });
        if (typeof window.handleTutorialMenuClose === 'function') {
            window.handleTutorialMenuClose();
        }
    }
}

// --- INTERFACE AUDIO INTEGRATION (REWORKED FOR INDEPENDENT CONTROL OVERLAYS) ---
let ytPlayer = null;
let isAudioPlaying = false;

// New standalone state vectors
let musicVolume = 70;         // Range: 0 - 100 (YouTube)
let heartbeatVolume = 1.0;    // Range: 0.0 - 1.0 (HTML5 Audio)
let isMusicMuted = false;
let isHeartbeatMuted = false;

window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('youtubeAudioPlayer', {
        height: '0',
        width: '0',
        videoId: '5nGkx-Dk2Ps',
        playerVars: {
            'playsinline': 1,
            'loop': 1,
            'controls': 0,
            'disablekb': 1,
            'autoplay': 1, 
            'mute': 1      
        },
        events: {
            'onReady': onPlayerReady
        }
    });
};

function onPlayerReady(event) {
    const audioToggleBtn = document.getElementById('audioToggleBtn');
    const audioStatusText = audioToggleBtn ? audioToggleBtn.querySelector('.audio-status-text') : null;

    if (audioToggleBtn && audioStatusText) {
        audioToggleBtn.style.pointerEvents = 'auto';
        
        // Convert label text to an SVG layout equipped with an overlay cross line container
        audioStatusText.innerHTML = `
            <div class="audio-icon-wrapper" id="audioIconWrapper">
                <svg class="dock-audio-icon" viewBox="0 0 24 24" fill="currentColor" style="width:100%; height:100%;">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
                <svg class="audio-mute-cross" viewBox="0 0 24 24" fill="none" stroke="#ff4400" stroke-width="3" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </div>
        `;
    }
    event.target.playVideo();
    
    const initialUnlock = () => {
        if (ytPlayer && typeof ytPlayer.unMute === 'function') {
            if (!isMusicMuted) ytPlayer.unMute();
            fadeInAudio(2000); 
            
            if (audioToggleBtn) {
                audioToggleBtn.classList.add('is-active');
            }
            isAudioPlaying = true;
            
            window.removeEventListener('click', initialUnlock);
            window.removeEventListener('keydown', initialUnlock);
        }
    };
    
    window.addEventListener('click', initialUnlock);
    window.addEventListener('keydown', initialUnlock);
}

function fadeInAudio(durationMs) {
    if (!ytPlayer || isMusicMuted) return;
    let currentVolume = 0;
    ytPlayer.setVolume(currentVolume);
    
    const intervalTime = 50; 
    const totalSteps = durationMs / intervalTime;
    const volumeStep = musicVolume / totalSteps;

    const fadeInterval = setInterval(() => {
        if (isMusicMuted) {
            clearInterval(fadeInterval);
            return;
        }
        currentVolume += volumeStep;
        if (currentVolume >= musicVolume) {
            currentVolume = musicVolume;
            clearInterval(fadeInterval);
        }
        ytPlayer.setVolume(Math.floor(currentVolume));
    }, intervalTime);
}

// --- INITIALIZE NEW SEPARATE AUDIO CONTROL PANEL INTERFACE ELEMENTS ---
function setupAudioInterfaceControls() {
    const audioToggleBtn = document.getElementById('audioToggleBtn');
    const audioStatusText = audioToggleBtn ? audioToggleBtn.querySelector('.audio-status-text') : null;

    if (audioToggleBtn && audioStatusText) {
        audioToggleBtn.style.pointerEvents = 'auto';
        
        // Convert label text to a clean, minimal SVG inline audio wave icon button
        audioStatusText.innerHTML = `
            <svg class="dock-audio-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
        `;
    }
    
    // Inject custom structural scoping styles for panel elements
    // Inject custom structural scoping styles for panel elements
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
        #audioToggleBtn { position: relative; overflow: visible; }
        #audioSettingsPanel {
            display: none; position: absolute; top: 110%; right: 0; 
            background: rgba(5, 7, 12, 0.95); border: 1px solid rgba(255, 68, 0, 0.25);
            border-radius: 4px; padding: 15px; width: 240px; text-align: left;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8); z-index: 99999; font-family: sans-serif;
        }
        #audioToggleBtn.panel-open #audioSettingsPanel { display: block; }
        .audio-control-row { margin-bottom: 12px; }
        .audio-control-row:last-child { margin-bottom: 0; }
        .audio-control-row label { display: block; font-size: 11px; color: #8a99ad; margin-bottom: 4px; letter-spacing: 1px; }
        .audio-control-inner { display: flex; align-items: center; gap: 10px; }
        .audio-control-inner input[type="range"] { flex-grow: 1; accent-color: #ff4400; background: #1a2333; height: 4px; border-radius: 2px; outline: none; }
        .audio-control-inner input[type="checkbox"] { accent-color: #ff4400; cursor: pointer; transform: scale(1.1); }
        
        /* --- DYNAMIC TRANSITION CROSSOVER ELEMENTS --- */
        .audio-icon-wrapper { position: relative; display: inline-block; width: 24px; height: 24px; }
        .audio-mute-cross {
            position: absolute; top: 2px; left: 2px; width: 20px; height: 20px;
            pointer-events: none; transform: scale(0) rotate(-45deg); opacity: 0;
            transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease;
        }
        .is-muted .audio-mute-cross { transform: scale(1) rotate(0deg); opacity: 1; }
        
        /* --- TIMELINE GRADIENT STYLING TRACKS --- */
        /* --- TIMELINE GRADIENT STYLING TRACKS --- */
        .timeline-bar { background: rgba(255, 255, 255, 0.1) !important; height: 6px; border-radius: 3px; cursor: pointer; position: relative; }
        #timelineProgress { 
            background: linear-gradient(90deg, #ff3300 0%, #ff7700 50%, #ff007f 100%) !important; 
            height: 100%; 
            border-radius: 3px; 
            width: 0%;
        }

        /* --- FORCE NATIVE CURSOR VISIBILITY DURING FULLSCREEN LAYERS --- */
        #cinemaContainer:-webkit-full-screen {
            cursor: auto !important;
        }
        #cinemaContainer:-ms-fullscreen {
            cursor: auto !important;
        }
        #cinemaContainer:fullscreen {
            cursor: auto !important;
        }
    `;
    document.head.appendChild(styleTag);

    // Build the separate control sliders and mute boxes markup layout
    const panel = document.createElement('div');
    panel.id = 'audioSettingsPanel';
    panel.innerHTML = `
        <div class="audio-control-row">
            <div class="audio-row-header">
                <label>AMBIENT MUSIC</label>
                <span class="mute-column-label">MUTE</span>
            </div>
            <div class="audio-control-inner">
                <input type="range" id="musicVolSlider" min="0" max="100" value="${musicVolume}">
                <input type="checkbox" id="musicMuteCheck" title="Mute Music">
            </div>
        </div>
        <div class="audio-control-row">
            <div class="audio-row-header">
                <label>HEARTBEAT SFX</label>
                <span class="mute-column-label">MUTE</span>
            </div>
            <div class="audio-control-inner">
                <input type="range" id="heartbeatVolSlider" min="0" max="100" value="${heartbeatVolume * 100}">
                <input type="checkbox" id="heartbeatMuteCheck" title="Mute Heartbeat">
            </div>
        </div>
    `;
    audioToggleBtn.appendChild(panel);

    // Click handler to open and close panel settings overlay frame container
    audioToggleBtn.addEventListener('click', (e) => {
        if (e.target.closest('#audioSettingsPanel')) return;
        audioToggleBtn.classList.toggle('panel-open');
    });

    // Automatically click-collapse dropdown window frame components if selecting away
    document.addEventListener('click', (e) => {
        if (!audioToggleBtn.contains(e.target)) {
            audioToggleBtn.classList.remove('panel-open');
        }
    });

    // Hook tracking components back into core runtime data
    const musicSlider = document.getElementById('musicVolSlider');
    const musicCheckbox = document.getElementById('musicMuteCheck');
    const heartbeatSlider = document.getElementById('heartbeatVolSlider');
    const heartbeatCheckbox = document.getElementById('heartbeatMuteCheck');

    musicSlider.addEventListener('input', (e) => {
        musicVolume = parseInt(e.target.value, 10);
        if (ytPlayer && typeof ytPlayer.setVolume === 'function' && !isMusicMuted) {
            ytPlayer.setVolume(musicVolume);
        }
    });

    musicCheckbox.addEventListener('change', (e) => {
        isMusicMuted = e.target.checked;
        if (ytPlayer && typeof ytPlayer.mute === 'function') {
            if (isMusicMuted) {
                ytPlayer.mute();
            } else {
                ytPlayer.unMute();
                ytPlayer.setVolume(musicVolume);
            }
        }
    });

    heartbeatSlider.addEventListener('input', (e) => {
        heartbeatVolume = parseFloat(e.target.value) / 100;
    });

    heartbeatCheckbox.addEventListener('change', (e) => {
        isHeartbeatMuted = e.target.checked;
    });
}

// Automatically invoke the interface engine hook routine layout
setupAudioInterfaceControls();

    // Top Dock Navigation Handlers
    const navButtons = document.querySelectorAll('.nav-link-node');
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            console.log(`System Navigation Vector Redirecting To: ${e.currentTarget.innerText}`);
        });
        btn.addEventListener('selectstart', (e) => e.preventDefault());
    });

    const tutorialReplayBtn = document.getElementById('tutorialReplayBtn');
    const TUTORIAL_REPLAY_FLAG = 'tutorialReplayArmed';
    if (tutorialReplayBtn) {
        const updateTutorialReplayButtonState = () => {
            const progress = parseInt(sessionStorage.getItem('tutorialProgress') || '0', 10);
            const replayArmed = sessionStorage.getItem(TUTORIAL_REPLAY_FLAG) === '1';
            const shouldShowSkip = replayArmed && progress < 8;

            tutorialReplayBtn.classList.toggle('is-skip', shouldShowSkip);
            tutorialReplayBtn.textContent = shouldShowSkip ? 'SKIP' : '?';
            tutorialReplayBtn.setAttribute('title', shouldShowSkip ? 'Skip tutorial' : 'Replay tutorial');
            tutorialReplayBtn.setAttribute('aria-label', shouldShowSkip ? 'Skip tutorial' : 'Replay tutorial');

            if (progress >= 8 && replayArmed) {
                sessionStorage.removeItem(TUTORIAL_REPLAY_FLAG);
            }
        };

        updateTutorialReplayButtonState();

        tutorialReplayBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const isSkipMode = tutorialReplayBtn.classList.contains('is-skip');
            if (isSkipMode) {
                sessionStorage.setItem('tutorialProgress', '8');
                sessionStorage.removeItem(TUTORIAL_REPLAY_FLAG);
            } else {
                sessionStorage.setItem('tutorialProgress', '0');
                sessionStorage.setItem(TUTORIAL_REPLAY_FLAG, '1');
            }

            window.location.reload();
        });
        tutorialReplayBtn.addEventListener('selectstart', (e) => e.preventDefault());
    }

    // Inject Script Element Link
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
document.addEventListener("DOMContentLoaded", () => {
    const transitionOverlay = document.getElementById("pageTransitionOverlay");

    function fadeAndNavigate(url) {
        if (!transitionOverlay) {
            window.location.href = url;
            return;
        }
        sessionStorage.setItem('pageTransitionFadeIn', 'true');
        transitionOverlay.classList.remove('is-hidden');
        transitionOverlay.classList.add('fade-to-black');
        transitionOverlay.style.display = 'block';
        transitionOverlay.style.visibility = 'visible';
        transitionOverlay.getBoundingClientRect();
        requestAnimationFrame(() => {
            transitionOverlay.style.opacity = '1';
        });
        setTimeout(() => {
            window.location.href = url;
        }, 820);
    }

    document.addEventListener('click', (event) => {
        const clickedLink = event.target.closest('a[href]');
        if (!clickedLink) return;

        const href = clickedLink.getAttribute('href');
        const tutorialTarget = href === 'motion.html' ? 'motion'
            : href === 'stasis.html' ? 'stasis'
            : href === 'dialogue.html' ? 'dialogue'
            : href === 'origin.html' ? 'origin'
            : null;

        if (tutorialTarget && !isTutorialInteractionAllowed(tutorialTarget)) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        if (href && href !== '#' && !href.startsWith('javascript:')) {
            event.preventDefault();
            event.stopPropagation();
            fadeAndNavigate(href);
        }
    }, true);
    const homePageTrigger = document.getElementById("motionMenuTrigger");
    const video = document.getElementById("shortFilmPlayer");
    const hideTransitionOverlay = () => {
        if (!transitionOverlay) return;
        transitionOverlay.style.transition = "opacity 0.8s ease";
        transitionOverlay.style.opacity = "0";
        transitionOverlay.style.pointerEvents = "none";
        transitionOverlay.style.visibility = "hidden";
        transitionOverlay.classList.add("is-hidden");
        setTimeout(() => {
            if (transitionOverlay) transitionOverlay.style.display = "none";
        }, 820);
    };

    // Fade in only when this page was reached through our transition navigation
    if (transitionOverlay && sessionStorage.getItem('pageTransitionFadeIn') === 'true') {
        transitionOverlay.classList.remove('is-hidden');
        transitionOverlay.classList.add('fade-to-black');
        transitionOverlay.style.display = 'block';
        transitionOverlay.style.visibility = 'visible';
        transitionOverlay.style.opacity = '1';
        transitionOverlay.getBoundingClientRect();
        requestAnimationFrame(() => {
            hideTransitionOverlay();
        });
        sessionStorage.removeItem('pageTransitionFadeIn');
    } else if (transitionOverlay) {
        transitionOverlay.classList.add('is-hidden');
    }

    // Small visible debug toast for environments where console is not visible
    window.showDebugToast = function(msg, timeout = 2200) {
        try {
            let t = document.getElementById('__debug_toast');
            if (!t) {
                t = document.createElement('div');
                t.id = '__debug_toast';
                t.style.position = 'fixed';
                t.style.right = '18px';
                t.style.top = '18px';
                t.style.zIndex = 9999999;
                document.body.appendChild(t);
            }
            const el = document.createElement('div');
            el.style.background = 'rgba(10,12,16,0.9)';
            el.style.color = 'white';
            el.style.padding = '8px 12px';
            el.style.marginTop = '8px';
            el.style.borderRadius = '6px';
            el.style.fontFamily = 'monospace';
            el.style.fontSize = '12px';
            el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.6)';
            el.textContent = msg;
            t.appendChild(el);
            setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.4s ease'; setTimeout(() => el.remove(), 450); }, timeout);
        } catch (err) { /* ignore */ }
    };

    hideTransitionOverlay();

    if (shouldAutoOpenTutorialMenu() && menuContainer && !menuContainer.classList.contains('active-menu')) {
        toggleHeartMenu();
    }

    if (homePageTrigger) {
        window.addEventListener("click", (event) => {
            const isMotionClick = event.target.closest("#motionMenuTrigger");

            if (isMotionClick) {
                if (!isTutorialInteractionAllowed('motion')) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }

                if (transitionOverlay) {
                    event.preventDefault();
                    event.stopPropagation();
                    fadeAndNavigate('motion.html');
                }
            }
        });
        return;
    }

    if (!video) return;

    isOnCinemaPage = true;

    // Ensure the Three.js canvas does not block UI clicks on the cinema page
    try {
        if (typeof renderer !== 'undefined' && renderer && renderer.domElement) {
            renderer.domElement.style.position = 'fixed';
            renderer.domElement.style.top = '0';
            renderer.domElement.style.left = '0';
            renderer.domElement.style.zIndex = '0';
            renderer.domElement.style.pointerEvents = 'none';
        }
    } catch (err) { /* ignore if renderer not yet available */ }

    const container = document.getElementById("cinemaContainer");
    const playPauseBtn = document.getElementById("playPauseBtn");
    const playIcon = document.getElementById("playIcon");
    const pauseIcon = document.getElementById("pauseIcon");
    const volumeSlider = document.getElementById("volumeSlider");
    const fullscreenBtn = document.getElementById("fullscreenBtn");
    const timelineBar = document.querySelector(".timeline-bar");
    const timelineProgress = document.getElementById("timelineProgress");
    const timelineHandle = document.getElementById("timelineHandle");
    const currentTimeDisplay = document.getElementById("currentTime");
    const totalDurationDisplay = document.getElementById("totalDuration");

    let hideControlsTimeout;
    function resetControlsTimeout() {
        if (!container) return;
        
        // 1. Reveal UI controls overlay frame
        container.classList.add("controls-visible");
        
        // 2. Clear out custom cursor tracking completely if fullscreen is active
        if (document.fullscreenElement) {
            // Force hide the custom tracking element out of the rendering tree
            if (typeof blobElement !== 'undefined' && blobElement) blobElement.style.display = 'none';
            if (typeof cursor !== 'undefined' && cursor) cursor.style.display = 'none';
            
            // Revert container directly to your clean native operating system mouse arrow
            container.style.setProperty('cursor', 'auto', 'important');
            video.style.setProperty('cursor', 'auto', 'important');
        } else {
            // Restore custom tracking system when windowed
            if (typeof blobElement !== 'undefined' && blobElement) blobElement.style.display = 'block';
            if (typeof cursor !== 'undefined' && cursor) {
                cursor.style.display = 'block';
                cursor.style.opacity = "1";
            }
        }
        
        clearTimeout(hideControlsTimeout);

        if (!video.paused) {
            hideControlsTimeout = setTimeout(() => {
                container.classList.remove("controls-visible");
                
                if (document.fullscreenElement) {
                    // Hide native cursor after 2.5 seconds of absolute stillness
                    container.style.setProperty('cursor', 'none', 'important');
                    video.style.setProperty('cursor', 'none', 'important');
                } else {
                    if (typeof cursor !== 'undefined' && cursor) cursor.style.opacity = "0";
                }
            }, 2500);
        }
    }

    if (container) container.addEventListener("mousemove", resetControlsTimeout);
    video.addEventListener("play", resetControlsTimeout);
    video.addEventListener("pause", () => {
        clearTimeout(hideControlsTimeout);
        if (container) container.classList.add("controls-visible");
    });

    function togglePlay(event) {
        if (event) event.stopPropagation();

        if (video.paused) {
            video.play().catch(() => {});
            if (playIcon) playIcon.style.display = "none";
            if (pauseIcon) pauseIcon.style.display = "block";
        } else {
            video.pause();
            if (playIcon) playIcon.style.display = "block";
            if (pauseIcon) pauseIcon.style.display = "none";
        }
    }

    if (playPauseBtn) playPauseBtn.addEventListener("click", togglePlay);
    video.addEventListener("click", togglePlay);

    function formatTime(seconds) {
        if (isNaN(seconds)) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    video.addEventListener("loadedmetadata", () => {
        if (totalDurationDisplay) totalDurationDisplay.textContent = formatTime(video.duration);
    });

    // VARIABLE CAPTURE TRACKING INTERFACES FOR AUDIO TOGGLES
    const audioIconWrapper = document.getElementById('audioIconWrapper');

    video.addEventListener("timeupdate", () => {
        if (video.duration) {
            const percentage = (video.currentTime / video.duration) * 100;
            if (timelineProgress) timelineProgress.style.width = `${percentage}%`;
            if (timelineHandle) timelineHandle.style.left = `${percentage}%`;
            if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(video.currentTime);
            
            // --- AUTOMATIC OVERLAY DISMISSAL SYSTEM (4-5 SECOND WINDOW) ---
            if (video.currentTime >= 4) {
                hideTransitionOverlay();
            }
        }
    });

    // EXTENDED: AUDIO BUTTON INTERACTION HANDLER MUTE LOGIC
    const audioToggleBtn = document.getElementById('audioToggleBtn');
    if (audioToggleBtn) {
        audioToggleBtn.addEventListener('click', (e) => {
            // Prevent interference if settings window sub-panel gets selected
            if (e.target.closest && e.target.closest('#audioSettingsPanel')) return;

            // Invert audio engine variable properties
            const processMuteState = !video.muted;
            video.muted = processMuteState;

            // Keep the visible volume slider in sync (0 when muted)
            if (volumeSlider) {
                try { volumeSlider.value = processMuteState ? 0 : Math.max(0, Math.min(1, video.volume)); } catch (err) {}
            }

            // Add/remove the visual muted class on the button itself (reliable target)
            if (processMuteState) {
                audioToggleBtn.classList.add('is-muted');
            } else {
                audioToggleBtn.classList.remove('is-muted');
            }

            console.log('audioToggleBtn clicked — muted:', processMuteState);
            try { window.showDebugToast && window.showDebugToast('Audio: ' + (processMuteState ? 'muted' : 'unmuted')); } catch (e) {}

            // Also mirror to any legacy internal wrapper if present
            if (audioIconWrapper && audioIconWrapper.classList) {
                audioIconWrapper.classList.toggle('is-muted', processMuteState);
            }
        });
    }

    // Capture-phase fallback: detect clicks that land over the audio button area
    (function() {
        let lastToggle = 0;
        document.addEventListener('click', (e) => {
            try {
                if (!audioToggleBtn) return;
                const rect = audioToggleBtn.getBoundingClientRect();
                const x = e.clientX, y = e.clientY;
                if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                    // prevent rapid double toggles
                    const now = Date.now();
                    if (now - lastToggle < 250) return;
                    lastToggle = now;

                    // respect clicks inside settings panel
                    if (e.target && e.target.closest && e.target.closest('#audioSettingsPanel')) return;

                    const processMuteState = !video.muted;
                    video.muted = processMuteState;
                    audioToggleBtn.classList.toggle('is-muted', processMuteState);
                    if (audioIconWrapper && audioIconWrapper.classList) audioIconWrapper.classList.toggle('is-muted', processMuteState);
                    console.log('capture-fallback: audio toggled, muted=', processMuteState);
                    try { window.showDebugToast && window.showDebugToast('Audio (fallback): ' + (processMuteState ? 'muted' : 'unmuted')); } catch (e) {}

                    // schedule overlay hide if playing
                    if (!video.paused && transitionOverlay) {
                        setTimeout(() => {
                            try {
                                if (video.currentTime >= 4) {
                                    transitionOverlay.style.transition = 'opacity 1s ease';
                                    transitionOverlay.style.opacity = '0';
                                    transitionOverlay.style.pointerEvents = 'none';
                                    console.log('transitionOverlay hidden by capture-fallback');
                                    try { window.showDebugToast && window.showDebugToast('Overlay hidden'); } catch (e) {}
                                }
                            } catch (err) {}
                        }, 4500);
                    }
                }
            } catch (err) { }
        }, true);
    })();

    // Fallback: ensure overlay hides a few seconds after play even if timeupdate doesn't fire reliably
    video.addEventListener("play", () => {
        console.log('video.play fired, currentTime=', video.currentTime);
        hideTransitionOverlay();
        setTimeout(() => {
            hideTransitionOverlay();
            console.log('transitionOverlay hidden by play-fallback');
        }, 4500);
    });

    if (timelineBar) {
        timelineBar.addEventListener("click", (e) => {
            e.stopPropagation();
            const rect = timelineBar.getBoundingClientRect();
            const clickPosition = (e.clientX - rect.left) / rect.width;
            video.currentTime = clickPosition * video.duration;
        });
    }

    if (volumeSlider) {
        volumeSlider.addEventListener("input", (e) => {
            e.stopPropagation();
            video.volume = e.target.value;
            video.muted = (video.volume === 0);
            if (audioIconWrapper) {
                if (video.muted) {
                    audioIconWrapper.classList.add('is-muted');
                } else {
                    audioIconWrapper.classList.remove('is-muted');
                }
            }
        });
    }

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!document.fullscreenElement) {
                container.requestFullscreen()
                    .then(() => {
                        // Immediate direct enforcement upon entering fullscreen
                        if (typeof blobElement !== 'undefined' && blobElement) blobElement.style.display = 'none';
                        if (typeof cursor !== 'undefined' && cursor) cursor.style.display = 'none';
                        container.style.setProperty('cursor', 'auto', 'important');
                        video.style.setProperty('cursor', 'auto', 'important');
                    })
                    .catch(() => {});
            } else {
                document.exitFullscreen();
            }
        });
    }

    // --- IMMUTABLE FULLSCREEN CURSOR RECOVERY PIPELINE ---
    // --- FULLSCREEN NATIVE MOUSE RECOVERY CONTROLLER ---
document.addEventListener('fullscreenchange', () => {
    const cursorHideStyle = document.getElementById('global-cursor-hide');

    if (document.fullscreenElement) {
        // 1. Fullscreen active: Completely destroy the CSS rule masking your pointer
        if (cursorHideStyle) {
            cursorHideStyle.remove();
        }
        
        // 2. Explicitly force all structural video layout tags to show your normal mouse arrow
        document.documentElement.style.setProperty('cursor', 'auto', 'important');
        
        const container = document.getElementById("cinemaContainer");
        const video = document.getElementById("shortFilmPlayer");
        if (container) container.style.setProperty('cursor', 'auto', 'important');
        if (video) video.style.setProperty('cursor', 'auto', 'important');
        
        console.log("Entering Fullscreen: Global hide rule deleted. Native cursor restored.");
    } else {
        // 1. Windowed mode active: Build and re-inject the hide rule back into your page
        if (!document.getElementById('global-cursor-hide')) {
            const freshStyle = document.createElement('style');
            freshStyle.id = 'global-cursor-hide';
            freshStyle.innerHTML = 'html, body, * { cursor: none !important; }';
            document.head.appendChild(freshStyle);
        }
        
        // 2. Wipe the inline overrides to ensure the fresh hide rule runs smoothly
        document.documentElement.style.removeProperty('cursor');
        
        const container = document.getElementById("cinemaContainer");
        const video = document.getElementById("shortFilmPlayer");
        if (container) container.style.cursor = '';
        if (video) video.style.cursor = '';
        
        console.log("Leaving Fullscreen: Global hide rule restored.");
    }
});
});
// --- ACCELERATED HARDWARE CURSOR ENFORCEMENT ENGINE ---
(function() {
    let fsMoveTimeout;

    document.addEventListener('mousemove', () => {
        // If we are currently in fullscreen mode
        if (document.fullscreenElement) {
            const container = document.getElementById("cinemaContainer");
            const video = document.getElementById("shortFilmPlayer");
            
            // Forcefully drop any style blocks lingering in the document tree
            const badStyle = document.getElementById('global-cursor-hide');
            if (badStyle) badStyle.remove();

            // Direct hardware style projection overrides
            document.documentElement.style.setProperty('cursor', 'auto', 'important');
            document.body.style.setProperty('cursor', 'auto', 'important');
            if (container) container.style.setProperty('cursor', 'auto', 'important');
            if (video) video.style.setProperty('cursor', 'auto', 'important');

            // Clear the auto-hide timer when the mouse is active
            clearTimeout(fsMoveTimeout);

            // Optional: Auto-hide the cursor again after 3 seconds of perfect stillness during video playback
            if (video && !video.paused) {
                fsMoveTimeout = setTimeout(() => {
                    if (document.fullscreenElement) {
                        document.documentElement.style.setProperty('cursor', 'none', 'important');
                        document.body.style.setProperty('cursor', 'none', 'important');
                        if (container) container.style.setProperty('cursor', 'none', 'important');
                        if (video) video.style.setProperty('cursor', 'none', 'important');
                    }
                }, 3000);
            }
        }
    }, { passive: true });

    // Clean up when exiting fullscreen mode
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            clearTimeout(fsMoveTimeout);
            
            // Restore windowed mode hide rule safely
            if (!document.getElementById('global-cursor-hide')) {
                const freshStyle = document.createElement('style');
                freshStyle.id = 'global-cursor-hide';
                freshStyle.innerHTML = 'html, body, * { cursor: none !important; }';
                document.head.appendChild(freshStyle);
            }
            
            document.documentElement.style.removeProperty('cursor');
            document.body.style.removeProperty('cursor');
        }
    });
})();

let lastPumpScale = 0, isExpanding = true;

function updateCursorRibbon() {
    if (!blobElement || !hasMovedMouse) return;
    
    currentBlobPos.x += (targetMousePos.x - currentBlobPos.x) * 0.32;
    currentBlobPos.y += (targetMousePos.y - currentBlobPos.y) * 0.32;
    
    blobElement.style.transform = `translate3d(${currentBlobPos.x}px, ${currentBlobPos.y}px, 0) translate(-50%, -50%)`;
    
    if (promptBox) {
        promptBox.style.transform = `translate3d(${currentBlobPos.x}px, ${currentBlobPos.y}px, 0)`;
    }

    trailOpacity += ((isHovered ? 0.0 : 1.0) - trailOpacity) * (isHovered ? 0.12 : 0.25); 
    if (trailPolygonElement) trailPolygonElement.style.opacity = trailOpacity;

    pointsHistory.push({ x: currentBlobPos.x, y: currentBlobPos.y });
    if (pointsHistory.length > MAX_TRAIL_POINTS) pointsHistory.shift();

    if (pointsHistory.length > 2 && trailPolygonElement) {
        const leftSidePoints = [], rightSidePoints = [];
        for (let i = 0; i < pointsHistory.length; i++) {
            const current = pointsHistory[i];
            let next = pointsHistory[i + 1] || current, prev = pointsHistory[i - 1] || current;
            let dx = next.x - prev.x, dy = next.y - prev.y;
            let len = Math.hypot(dx, dy) || 1;
            let nx = -dy / len, ny = dx / len;
            const currentWidth = 14 * (i / (pointsHistory.length - 1)); 
            
            leftSidePoints.push({ x: current.x + nx * currentWidth, y: current.y + ny * currentWidth });
            rightSidePoints.unshift({ x: current.x - nx * currentWidth, y: current.y - ny * currentWidth });
        }
        trailPolygonElement.setAttribute('points', leftSidePoints.concat(rightSidePoints).map(p => `${p.x},${p.y}`).join(' '));
    }
}

const worldPosHolder = new THREE.Vector3();
let isOnCinemaPage = false;

function animate() {
    requestAnimationFrame(animate);
    
    // Skip Three.js rendering if on cinema page
    if (isOnCinemaPage) return;
    
    const t = performance.now() * 0.001;
    bgMaterial.uniforms.time.value = t;
    waterMaterial.uniforms.time.value = t;

    if (!isOnCinemaPage) updateCursorRibbon();
    if (mirror) mirror.onBeforeRender(renderer, scene, camera);

    if (!drag) ry += 0.0015;
    heartGroup.rotation.y += (ry - heartGroup.rotation.y) * 0.05;
    heartGroup.rotation.x += (rx - heartGroup.rotation.x) * 0.05;

    if (outerModel && innerModel) {
        hoverScaleLerp += ((isHovered ? 1.0 : 0.0) - hoverScaleLerp) * 0.1;
        
        const pumpOuter = Math.max(0, Math.sin(t * 2.3) + Math.sin(t * 4.6) * 0.25) * 0.12 * (1.0 - hoverScaleLerp); 
        const targetOuterScale = baseScale * (1.0 + pumpOuter) * (1.0 + hoverScaleLerp * 0.15);
        outerModel.scale.set(targetOuterScale, baseScale * (1.0 + hoverScaleLerp * 0.15), targetOuterScale);

        if (!isHovered) {
            if (pumpOuter > lastPumpScale && !isExpanding) {
                isExpanding = true;
            }
            else if (pumpOuter < lastPumpScale && isExpanding) { 
                spawnShardBurst(3); 
                playHeartbeatSound(1.0); 
                isExpanding = false; 
            }
        }
        lastPumpScale = pumpOuter;

        // --- SUBTLE CAMERA PUMP ACCENT ---
        // We take the current visual heartbeat intensity (pumpOuter) and scale it down significantly (0.8)
        // This pushes the target camera position slightly forward/backward based on the contraction
        const zoomOffset = pumpOuter * 0.8; 
        
        if (!isMenuMode) {
            const zoomStrength = pumpOuter * 0.05; // Lower number = more subtle
            camera.position.x -= zoomStrength * 1.5;
            camera.position.z += zoomStrength;
        }

        const pumpInner = Math.max(0, Math.sin((t - 0.35) * 2.3) + Math.sin((t - 0.35) * 4.6) * 0.25) * 0.22 * (1.0 - hoverScaleLerp); 
        let targetInnerScale = baseScale * 0.35 * (1.0 + pumpInner) * (1.0 + hoverScaleLerp * 0.15);
        
        const maxSafeScale = targetOuterScale * 0.65; 
        if (targetInnerScale > maxSafeScale) {
            targetInnerScale = maxSafeScale;
        }

        innerModel.scale.set(targetInnerScale, baseScale * 0.35 * (1.0 + hoverScaleLerp * 0.15), targetInnerScale);
        innerModel.rotateOnAxis(coreRotationAxis, 0.008);
        
        coreLight.intensity = (45 + (pumpInner * 80)) * (1.0 + hoverScaleLerp * 0.3);
        heartGroup.getWorldPosition(curH); coreLight.position.copy(curH);
    }

    shardTimeScale += (((isMenuMode ? 0.0 : 1.0) - shardTimeScale) * 0.05); 

    const d = new THREE.Object3D();
    for (let i = 0; i < MAX_SHARDS; i++) {
        const data = shardsData[i];
        if (data) {
            if (!data.isEvicting) {
                data.velocity.lerp(data.floatDrift, 0.012 * shardTimeScale);
                data.position.addScaledVector(data.velocity, 0.016 * shardTimeScale);
                data.position.x += ((Math.sin(t * 0.2 + i) * 0.003) + (Math.cos(t * 0.1 + i * 0.5) * 0.001)) * shardTimeScale;
                data.position.y += (Math.sin(t * 0.15 + i * 2.0) * 0.0015) * shardTimeScale; 
                data.position.z += ((Math.cos(t * 0.2 + i) * 0.003) + (Math.sin(t * 0.1 + i * 0.7) * 0.001)) * shardTimeScale;
            } else {
                data.position.x -= 0.6 * shardTimeScale; data.position.z -= 0.6 * shardTimeScale;
            }
            data.rotation.x += data.spin.x * shardTimeScale;
            data.rotation.y += data.spin.y * shardTimeScale;
            data.rotation.z += data.spin.z * shardTimeScale;

            let finalScale = data.scale;
            if (data.twinkleSpeed > 0) {
                finalScale *= (Math.sin(t * data.twinkleSpeed * shardTimeScale + data.twinklePhase) * 0.4 + 0.6); 
            }
            d.position.copy(data.position); d.rotation.copy(data.rotation); d.scale.setScalar(finalScale); 
            d.updateMatrix(); shardMesh.setMatrixAt(i, d.matrix);
        }
    }
    shardMesh.instanceMatrix.needsUpdate = true;

    const targetCharacterY = isMenuMode ? -7.0 : -0.9;
    if (personGroupL) {
        personGroupL.position.y += (targetCharacterY - personGroupL.position.y) * 0.05;
        personGroupL.getWorldPosition(worldPosHolder); waterMaterial.uniforms.posPersonL.value.set(worldPosHolder.x, worldPosHolder.z);
    }
    if (personGroupR) {
        personGroupR.position.y += (targetCharacterY - personGroupR.position.y) * 0.05;
        personGroupR.getWorldPosition(worldPosHolder); waterMaterial.uniforms.posPersonR.value.set(worldPosHolder.x, worldPosHolder.z);
    }

    const targetTextY = isMenuMode ? -3.0 : 3.0;
    titleMesh.position.y += (targetTextY - titleMesh.position.y) * 0.05;

    if (isMenuMode) {
        camera.position.lerp(menuCamTarget, 0.05); cameraTarget.lerp(menuLookAt, 0.05);
    } else {
        camera.position.x += ((camBase.x + mouse.x * 1.5) - camera.position.x) * 0.03;
        camera.position.y += (camBase.y - camera.position.y) * 0.03; camera.position.z += (camBase.z - camera.position.z) * 0.03;
        cameraTarget.lerp(defaultLookAt, 0.05);
    }
    camera.lookAt(cameraTarget);

    curM.set(mouse.x * 10, mouse.y * 5, 10);
    if (heartGroup) heartGroup.getWorldPosition(curH);
    curL.lerp(drag ? curH : curM, 0.03);
    if (headL) headL.lookAt(isMenuMode ? curH : curL); 
    if (headR) headR.lookAt(isMenuMode ? curH : curL);

    composer.render();
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});

}// END THREE.JS INIT (index.html only)

// === CINEMA PAGE & EVENT LISTENERS ===
// --- VIRTUAL SOFTWARE CURSOR FULLSCREEN BYPASS ---
(function() {
    let virtualCursor = null;
    let hideCursorTimeout;

    // 1. Create the virtual cursor element dynamically
    function createVirtualCursor() {
        if (document.getElementById('v-fullscreen-cursor')) return;
        
        virtualCursor = document.createElement('div');
        virtualCursor.id = 'v-fullscreen-cursor';
        
        // CSS to build a clean hardware-looking arrow pointer
        virtualCursor.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 0;
            height: 0;
            border-left: 12px solid white;
            border-right: 12px solid transparent;
            border-bottom: 12px solid transparent;
            border-top: 12px solid white;
            filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.6));
            z-index: 2147483647; /* Maximum possible z-index layer */
            pointer-events: none;
            display: none;
            transform: translate3d(0, 0, 0);
        `;
        
        // Append it directly to your cinema container so it goes fullscreen with it
        const container = document.getElementById("cinemaContainer") || document.body;
        container.appendChild(virtualCursor);
    }

    // 2. Track mouse movement and update the virtual pointer location
    document.addEventListener('mousemove', (e) => {
        if (document.fullscreenElement) {
            if (!virtualCursor) createVirtualCursor();
            
            // Bring virtual cursor into view
            virtualCursor.style.display = 'block';
            virtualCursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
            
            clearTimeout(hideCursorTimeout);
            
            // Auto-hide the virtual pointer after 2.5 seconds of stillness (matches video controls)
            const video = document.getElementById("shortFilmPlayer");
            if (video && !video.paused) {
                hideCursorTimeout = setTimeout(() => {
                    if (virtualCursor) virtualCursor.style.display = 'none';
                }, 2500);
            }
        }
    }, { passive: true });

    // 3. Clean up and remove the virtual element when leaving fullscreen
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && virtualCursor) {
            clearTimeout(hideCursorTimeout);
            virtualCursor.remove();
            virtualCursor = null;
        }
    });
})();
// --- FIXED CORRECTION DIALOGUE ENGINE ---
// --- RETRO PIXEL TYPEWRITER ENGINE ---
// --- MULTI-PAGE CROSSOVER DIALOGUE ENGINE ---
// --- SESSION-VALIDATED PIXEL ENGINE ---
// --- MULTI-PHASED TOUR ENGINE ---
// --- CRASH-PROOF STATE-LINKED TOUR ENGINE ---
(function() {
    let currentStep = parseInt(sessionStorage.getItem('tutorialProgress') || '0');

    // Kill the system if the whole onboarding loop is finalized
    if (currentStep >= 8) {
        destroyTutorialMarkup();
        return;
    }

    let characterIndex = 0;
    let isTyping = false;
    let typingTimer = null;
    const typingSpeedMs = 40;

    const dialogueSteps = {
        0: { text: "SYSTEM INITIALIZED... WELCOME TO MY PORTFOLIO.", requiresAction: false },

1: { text: "MOVE YOUR CURSOR TO EXPLORE THE SPACE AND SHIFT YOUR VIEW.", requiresAction: false },

2: { text: "CLICK THE CENTRAL HEART TO OPEN THE MAIN MENU.", requiresAction: true },

3: { text: "START WITH 'IN MOTION' TO VIEW MY SHORT FILM AND PROJECT PRESENTATION.", requiresAction: true },

4: { text: "NEXT, OPEN 'IN STASIS' TO EXPLORE THE ARTBOOK, CONCEPT DEVELOPMENT, AND CREATIVE PROCESS.", requiresAction: true },

5: { text: "THEN, VISIT 'THE DIALOGUE' TO SEE MY PAST PROJECTS, EXTRACURRICULAR WORK, AND CREATIVE EXPERIENCES.", requiresAction: true },

6: { text: "FINALLY, ENTER 'THE ORIGIN' TO LEARN MORE ABOUT ME, MY BACKGROUND, AND MY ARTISTIC PERSPECTIVE.", requiresAction: true },

7: { text: "TUTORIAL COMPLETE. YOU MAY NOW EXPLORE THE PORTFOLIO FREELY. THANK YOU FOR VISITING.", requiresAction: false }
    };

    let container, textElement, promptElement;

    function init() {
        container = document.getElementById('tutorialDialogueContainer');
        textElement = document.getElementById('tutorialText');
        promptElement = document.getElementById('tutorialPrompt');

        if (!container || !textElement || !promptElement) return;

        // Reset tracking positions on startup baseline
        container.classList.remove('menu-active');

        runStepSequence(currentStep);

        // Click handler for text slides (Steps 0 and 1)
        container.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isTyping) {
                clearTimeout(typingTimer);
                textElement.textContent = dialogueSteps[currentStep].text;
                isTyping = false;
                setPromptStatus();
            } else if (!dialogueSteps[currentStep].requiresAction) {
                currentStep++;
                sessionStorage.setItem('tutorialProgress', currentStep.toString());
                runStepSequence(currentStep);
            }
        });
    }

    function runStepSequence(stepIndex) {
        currentStep = stepIndex;
        if (!dialogueSteps[currentStep]) {
            destroyTutorialMarkup();
            return;
        }

        isTyping = true;
        characterIndex = 0;
        textElement.textContent = "";
        promptElement.textContent = ""; 
        typeCharacterLoop();
    }

    function typeCharacterLoop() {
        const fullString = dialogueSteps[currentStep].text;
        if (characterIndex < fullString.length) {
            textElement.textContent += fullString.charAt(characterIndex);
            characterIndex++;
            typingTimer = setTimeout(typeCharacterLoop, typingSpeedMs);
        } else {
            isTyping = false;
            setPromptStatus();
        }
    }

    function setPromptStatus() {
        if (dialogueSteps[currentStep].requiresAction) {
            promptElement.textContent = "AWAITING REQUIRED INPUT...";
            promptElement.style.color = "#ff007f";
        } else if (currentStep === 7) {
            promptElement.textContent = "CLICK TO CLOSE TUTORIAL...";
            promptElement.style.color = "#ffe0a1";
        } else {
            promptElement.textContent = "CLICK BOX TO CONTINUE...";
            promptElement.style.color = "#ff4400";
        }
    }

    function applyTourHighlights() {
        document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
        
        let targetedWord = "";
        if (currentStep === 3) targetedWord = "MOTION";
        if (currentStep === 4) targetedWord = "STASIS";
        if (currentStep === 5) targetedWord = "DIALOGUE";
        if (currentStep === 6) targetedWord = "ORIGIN";

        if (targetedWord) {
            const targetBtn = Array.from(document.querySelectorAll('div, a, text, textPath'))
                                   .find(el => el.textContent.toUpperCase().includes(targetedWord));
            if (targetBtn) targetBtn.classList.add('tutorial-highlight');
        }
    }

    function destroyTutorialMarkup() {
        const el = document.getElementById('tutorialDialogueContainer');
        if (el) el.remove(); 
    }

    // --- GLOBAL HEART TRIGGER BRIDGE ---
    window.triggerTutorialMenuPhase = function() {
        if (!container) container = document.getElementById('tutorialDialogueContainer');
        if (!container) return;

        // FIXED: Dynamically capture your main menu container by checking its class name safely
        const actualMenu = document.querySelector('.active-menu') || document.getElementById('menuContainer');
        const heartIsActive = actualMenu && (actualMenu.classList.contains('active-menu') || isMenuMode === true);

        if (heartIsActive) {
            // HEART OPENING: Glide up to the middle smoothly
            container.classList.add('menu-active');
            
            if (currentStep === 2) {
                currentStep = 3;
                sessionStorage.setItem('tutorialProgress', '3');
                runStepSequence(3);
            } else {
                runStepSequence(currentStep); // Retype step text
            }
            
            setTimeout(applyTourHighlights, 150);
        } else {
            // HEART CLOSING: Glide safely back down to the floor baseline
            container.classList.remove('menu-active');
        }
    };

    // Global Reset Emergency Key ('R')
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'r') {
            sessionStorage.clear();
            window.location.reload();
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
// --- DEVELOPER BACKDOOR RESET KEY ---
window.addEventListener('keydown', (e) => {
    // If you press the 'R' key (case insensitive)
    if (e.key.toLowerCase() === 'r') {
        localStorage.clear();
        sessionStorage.clear();
        console.log("✓ All storage cleared safely.");
        window.location.reload(); // Hard reboots the browser page structure
    }
});