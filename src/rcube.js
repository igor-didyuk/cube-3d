class ShaderProgram {
	constructor(gl) {
		this.gl = gl;
		this.shaderProgram = gl.createProgram();
	}

	link() {
		this.gl.linkProgram(this.shaderProgram);
		if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
			const infoLog = this.gl.getProgramInfoLog(this.shaderProgram)
			throw new Error("Unable to initialize the shader program: " + infoLog);
		}
	}

	attachShader(shader) {
		this.gl.attachShader(this.shaderProgram, shader);
	}

	getUniformLocation(name) {
		return this.gl.getUniformLocation(this.shaderProgram, name);
	}

	getAttribLocation(name) {
		return this.gl.getAttribLocation(this.shaderProgram, name);
	}

	use() {
		this.gl.useProgram(this.shaderProgram);
	}
}
class Facet {
	constructor(color, rotMatrix, colorPicker, letter) {
		this.colors = new Array(9).fill(new Float32Array(color));
		this.rotMatrix = new Float32Array(rotMatrix);
		this.colorPicker = colorPicker;
		this.letter = letter;
	}

	getColor(x, y, z) {
		const colorIndex = this.colorPicker(x, y, z);
		return colorIndex !== undefined ? this.colors[colorIndex] : undefined;
	}
}
class Move {
	constructor(faceRotator, acceptCubiePredicate, facetsByDim, axis, side) {
		this.faceRotator = faceRotator;
		this.acceptCubie = acceptCubiePredicate;

		const t = this.transformation = new Array(5);
		const mainFacet = facetsByDim[axis][side === 0 ? 0 : 1];
		const borderFacets = [facetsByDim[(axis + 1) % 3], facetsByDim[(axis + 2) % 3]];
		for (let i = 0; i !== 2; i++) {
			const trn = t[i] = new Array(4);
			for (let d0 = 0, d1 = i, j = 0; j !== 4; j++) {
				trn[j] = {
					f: mainFacet,
					d0: d0,
					d1: d1
				};
				if (side === 0) {
					const dt = d0;
					d0 = 2 - d1;
					d1 = dt;
				} else {
					const dt = d1;
					d1 = 2 - d0;
					d0 = dt;
				}
			}
		}

		for (let i = 0; i !== 3; i++) {
			const trn = t[i + 2] = new Array(4);
			for (let bd = i, bs = 0, j = 0; j !== 4; j++) {
				trn[j] = {
					f: borderFacets[j % 2][bs],
					d0: j % 2 ? side : bd,
					d1: j % 2 ? bd : side
				};
				if ((side === 0) === (j % 2 === 0)) {
					bd = 2 - bd;
				} else {
					bs = 1 - bs;
				}
			}
		}
	}

	complete(amount) {
		for (const trn of this.transformation) {
			const colors = trn.map(src => src.f.colors[src.d0 * 3 + src.d1]);
			for (let i = 0; i !== 4; i++) {
				const dst = trn[(i + 4 + amount) % 4];
				dst.f.colors[dst.d0 * 3 + dst.d1] = colors[i];
			}
		}
	}
}
class Animation {
	constructor(glCanvas, vertShader, fragShader) {
		this.scale = 1;

		this.glCanvas = glCanvas;

		// Set the drawing position to the "identity" point, which is the center of the scene.
		// And move the drawing position (0.0, 0.0, -10.0) a bit to where we want to start drawing.
		this.mvMatrix = new Float32Array([
			1.0, 0.0, 0.0,   0.0,
			0.0, 1.0, 0.0,   0.0,
			0.0, 0.0, 1.0, -10.0,
			0.0, 0.0, 0.0,   1.0
		]);
		this.rotMatrix = new Float32Array(16);
		this.viewState = {
			rotateX: 0,
			rotateY: 0,
			rotateMat0: new Float32Array([
				1, 0, 0, 0,
				0, 1, 0, 0,
				0, 0, 1, 0,
				0, 0, 0, 1])
		};

		this.facets = {
			F: new Facet(
				[1.0, 1.0, 1.0, 1.0],
				[
					1, 0, 0, 0,
					0, 1, 0, 0,
					0, 0, 1, 0,
					0, 0, 0, 1
				],
				(x, y, z) => { return z === 2 ? x * 3 + y : undefined },
				"F"
			),
			B: new Facet(
				[1.0, 1.0, 0.0, 1.0],
				[
					1,  0,  0, 0,
					0, -1,  0, 0,
					0,  0, -1, 0,
					0,  0,  0, 1
				],
				(x, y, z) => { return z === 0 ? x * 3 + y : undefined },
				"B"
			),
			U: new Facet(
				[0.0, 1.0, 0.0, 1.0],
				[
					1,  0,  0, 0,
					0,  0, -1, 0,
					0,  1,  0, 0,
					0,  0,  0, 1
				],
				(x, y, z) => { return y === 2 ? z * 3 + x : undefined },
				"U"
			),
			D: new Facet(
				[0.0, 0.0, 1.0, 1.0],
				[
					1,  0,  0, 0,
					0,  0,  1, 0,
					0, -1,  0, 0,
					0,  0,  0, 1
				],
				(x, y, z) => { return y === 0 ? z * 3 + x : undefined },
				"D"
			),
			L: new Facet(
				[1.0, 0.0, 0.0, 1.0],
				[
					 0,  0,  1, 0,
					 0,  1,  0, 0,
					-1,  0,  0, 0,
					 0,  0,  0, 1
				],
				(x, y, z) => { return x === 0 ? y * 3 + z : undefined },
				"L"
			),
			R: new Facet(
				[1.0, 0.5, 0.0, 1.0],
				[
					 0,  0, -1, 0,
					 0,  1,  0, 0,
					 1,  0,  0, 0,
					 0,  0,  0, 1
				],
				(x, y, z) => { return x === 2 ? y * 3 + z : undefined },
				"R"
			)
		};

		const axisX = 0;
		const axisY = 1;
		const axisZ = 2;
		const facetsByDim = [[this.facets.L, this.facets.R], [this.facets.D, this.facets.U], [this.facets.B, this.facets.F]];
		this.moves = {
			F: new Move (
				(mx, angle) => {
					mx[0] =  Math.cos(angle);
					mx[1] = -Math.sin(angle);
					mx[4] = -mx[1];
					mx[5] =  mx[0];
				},
				(x, y, z) => z === 2,
				facetsByDim, axisZ, 2
			),
			B: new Move (
				(mx, angle) => {
					mx[0] =  Math.cos(angle);
					mx[1] =  Math.sin(angle);
					mx[4] = -mx[1];
					mx[5] =  mx[0];
				},
				(x, y, z) => z === 0,
				facetsByDim, axisZ, 0
			),
			U: new Move (
				(mx, angle) => {
					mx[0] =  Math.cos(angle);
					mx[2] =  Math.sin(angle);
					mx[8] = -mx[2];
					mx[10] =  mx[0];
				},
				(x, y, z) => y === 2,
				facetsByDim, axisY, 2
			),
			D: new Move (
				(mx, angle) => {
					mx[0] =  Math.cos(angle);
					mx[2] = -Math.sin(angle);
					mx[8] = -mx[2];
					mx[10] =  mx[0];
				},
				(x, y, z) => y === 0,
				facetsByDim, axisY, 0
			),
			L: new Move (
				(mx, angle) => {
					mx[5] =  Math.cos(angle);
					mx[6] =  Math.sin(angle);
					mx[9] = -mx[6];
					mx[10] =  mx[5];
				},
				(x, y, z) => x === 0,
				facetsByDim, axisX, 0
			),
			R: new Move (
				(mx, angle) => {
					mx[5] =  Math.cos(angle);
					mx[6] = -Math.sin(angle);
					mx[9] = -mx[6];
					mx[10] =  mx[5];
				},
				(x, y, z) => x === 2,
				facetsByDim, axisX, 2
			)
		};

		this.color0 = new Float32Array([0.2, 0.2, 0.2, 1.0]);

		this.indexToCoordinate = new Array(3);
		for (let i = 0 ; i !== 3; i++) {
			this.indexToCoordinate[i] = i - (3 - 1) / 2;
		}

/*		const mvMatrix = this.mvMatrix;
		this.glCanvas.addEventListener("wheel", function(event) {
			if (event.deltaY < 0) {
				mvMatrix[14]--;
			} else {
				mvMatrix[14]++;
			}
			event.preventDefault();
		}, false)*/
		this.gl = this.glCanvas.getContext("webgl2", { antialias: true });
		console.info(this.gl.getParameter(this.gl.SHADING_LANGUAGE_VERSION));
		console.info(this.gl.getParameter(this.gl.VERSION));

		// Initialize a shader program; this is where all the lighting
		// for the vertices and so forth is established.
		const loadResource = (path) => {
			return new Promise((resolve, reject) => {
				const xhttp = new XMLHttpRequest();
	
				// Define a callback function
				xhttp.onload = function() {
					resolve(this.responseText)
				}
	
				// Send a request
				xhttp.open("GET", path);
				xhttp.send();
			});
		};

		Promise.all([
				loadResource(vertShader),
				loadResource(fragShader)
		]).then(sources => {
			// Draw the scene
			this.shaderProgram = new ShaderProgram(this.gl);
	
			this.loadShader(sources[0], this.gl.VERTEX_SHADER);
			this.loadShader(sources[1], this.gl.FRAGMENT_SHADER);
			this.prepareScene();

			this.draw(0);
		});
	}

	rotateSceneStart(captureX, captureY) {
		const viewState = this.viewState;
		viewState.captureX = captureX;
		viewState.captureY = captureY;
		viewState.captureRotateX = viewState.rotateX;
		viewState.captureRotateY = viewState.rotateY;
	}

	rotateScene(x, y) {
		const viewState = this.viewState;
		viewState.rotateX = viewState.captureRotateX + (x - viewState.captureX);
		viewState.rotateY = viewState.captureRotateY + (y - viewState.captureY);
//		console.log("X: " + viewState.rotateX + "; Y: " + viewState.rotateY);
	};

	rotateSceneFinish() {
		const viewState = this.viewState;
		viewState.rotateX = 0;
		viewState.rotateY = 0;
		viewState.rotateMat0.set(this.rotMatrix);
	}

	zoomScene(delta) {
		if (delta < 0) {
			this.mvMatrix[14]--;
		} else {
			this.mvMatrix[14]++;
		}
	}

	loadShader(source, shaderType) {
		const shader = this.gl.createShader(shaderType);
		this.gl.shaderSource(shader, source);
		this.gl.compileShader(shader);
		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
		  const infoLog = this.gl.getShaderInfoLog(shader);
		  this.gl.deleteShader(shader);
		  throw new Error("An error occurred compiling the shaders: " + infoLog);
		}

		this.shaderProgram.attachShader(shader);
	}
	initBuffers() {
		const sizeOuter = 0.5;
		const sizeBorder = 0.07;
		const sizeInner = sizeOuter - sizeBorder;
		const sizeFacet = sizeInner + sizeBorder / Math.sqrt(2);
		const cubePositions = [
			-sizeInner, -sizeInner, sizeOuter,
			-sizeInner, -sizeFacet, sizeFacet,
			-sizeFacet, -sizeFacet, sizeFacet,
			-sizeFacet, -sizeInner, sizeFacet,

			-sizeInner,  sizeInner, sizeOuter,
			-sizeFacet,  sizeInner, sizeFacet,
			-sizeFacet,  sizeFacet, sizeFacet,
			-sizeInner,  sizeFacet, sizeFacet,

			 sizeInner,  sizeInner, sizeOuter,
			 sizeInner,  sizeFacet, sizeFacet,
			 sizeFacet,  sizeFacet, sizeFacet,
			 sizeFacet,  sizeInner, sizeFacet,

			 sizeInner, -sizeInner, sizeOuter,
			 sizeFacet, -sizeInner, sizeFacet,
			 sizeFacet, -sizeFacet, sizeFacet,
			 sizeInner, -sizeFacet, sizeFacet
		];
		const cubePositionsBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, cubePositionsBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(cubePositions), this.gl.STATIC_DRAW);

		const normVert = 1 / Math.sqrt(3);
		const normEdge = 1 / Math.sqrt(2);
		const cubeNormals = [
			0, 0, 1,
			        0, -normEdge, normEdge,
			-normVert, -normVert, normVert,
			-normEdge,         0, normEdge,

			0, 0, 1,
			-normEdge,         0, normEdge,
			-normVert,  normVert, normVert,
			        0,  normEdge, normEdge,

			0, 0, 1,
			        0,  normEdge, normEdge,
			 normVert,  normVert, normVert,
			 normEdge,         0, normEdge,

			0, 0, 1,
			 normEdge,         0, normEdge,
			 normVert, -normVert, normVert,
			        0, -normEdge, normEdge
		];
		const cubeNormalsBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, cubeNormalsBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(cubeNormals), this.gl.STATIC_DRAW);

		const cubeElements = [
			 0,  1,  2,  3,  5,  4, // edge 1
			 4,  5,  6,  7,  9,  8, // edge 2
			 8,  9, 10, 11, 13, 12, // edge 3
			12, 13, 14, 15,  1,  0, // edge 4
			 0,  4,  8, 12 // facet
		];
		const cubeElementsBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, cubeElementsBuffer);
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(cubeElements), this.gl.STATIC_DRAW);

		return this.glBuffers = {
			cubePositions: cubePositionsBuffer,
			cubeNormals: cubeNormalsBuffer,
			cubeElements: cubeElementsBuffer
		};
	}

	getUniformLocation(name) {
		return this.shaderProgram.getUniformLocation(name);
	}

	getAttribLocation(name) {
		return this.shaderProgram.getAttribLocation(name);
	}

	prepareScene() {
		this.shaderProgram.link();

		this.lX = 1;
		this.lY = 1;

		const buffers = this.initBuffers();

		this.gl.clearDepth(1.0);            // Clear everything
		this.gl.enable(this.gl.DEPTH_TEST); // Enable depth testing
		this.gl.depthFunc(this.gl.LEQUAL);  // Near things obscure far things

		// Clear the canvas before we start drawing on it.
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		// Create a perspective matrix.
		const fieldOfView = 45 * Math.PI / 180;   // in radians
		const aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
		const zNear = 1;
		const zFar = 100.0;
		const projMatrix = this.makePerspective(fieldOfView, aspect, zNear, zFar);

		// Set the drawing position to the "identity" point, which is the center of the scene.
		// And move the drawing position (0.0, 0.0, -6.0) a bit to where we want to start drawing.
		const mvMatrix = this.mvMatrix;
		mvMatrix[0] = 1.0; mvMatrix[4] = 0.0; mvMatrix[ 8] = 0.0; mvMatrix[12] = 0.0;
		mvMatrix[1] = 0.0; mvMatrix[5] = 1.0; mvMatrix[ 9] = 0.0; mvMatrix[13] = 0.0;
		mvMatrix[2] = 0.0; mvMatrix[6] = 0.0; mvMatrix[10] = 1.0; mvMatrix[14] = -10.0;
		mvMatrix[3] = 0.0; mvMatrix[7] = 0.0; mvMatrix[11] = 0.0; mvMatrix[15] = 1.0;

		const rotMatrix = this.rotMatrix;
		rotMatrix[0] = 1.0; rotMatrix[4] = 0.0; rotMatrix[ 8] = 0.0; rotMatrix[12] = 0.0;
		rotMatrix[1] = 0.0; rotMatrix[5] = 1.0; rotMatrix[ 9] = 0.0; rotMatrix[13] = 0.0;
		rotMatrix[2] = 0.0; rotMatrix[6] = 0.0; rotMatrix[10] = 1.0; rotMatrix[14] = 0.0;
		rotMatrix[3] = 0.0; rotMatrix[7] = 0.0; rotMatrix[11] = 0.0; rotMatrix[15] = 1.0;

		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

		this.shaderProgram.use();

		this.shaderProgram.uProjMatrix = this.getUniformLocation('uProjMatrix');
		this.shaderProgram.uColor = this.getUniformLocation('uColor');
		this.shaderProgram.uMVMatrix = this.getUniformLocation('uMVMatrix');
		this.shaderProgram.uObjMatrix = this.getUniformLocation('uObjMatrix');

		// Set the shader uniforms
		this.gl.uniformMatrix4fv(this.shaderProgram.uProjMatrix, false, projMatrix);
	}

	makePerspective(fieldOfView, aspect, zNear, zFar) {
		const f = 1.0 / Math.tan(fieldOfView / 2);
		const nf = 1 / (zNear - zFar);
		const out =  new Float32Array(16);
		out[0] = f / aspect;
		out[1] = 0;
		out[2] = 0;
		out[3] = 0;
		out[4] = 0;
		out[5] = f;
		out[6] = 0;
		out[7] = 0;
		out[8] = 0;
		out[9] = 0;
		out[10] = (zFar + zNear) * nf;
		out[11] = -1;
		out[12] = 0;
		out[13] = 0;
		out[14] = 2 * zFar * zNear * nf;
		out[15] = 0;
		return out;
	}

	zoom(deltaY) {
		this.scale *= deltaY < 0 ? 0.5 : 2;
	}
	drawCube(time) {
		// 3D
		const gl = this.gl;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.cubePositions);
		const vertexPosition = this.getAttribLocation('vertexPosition_modelspace')
		gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vertexPosition);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.cubeNormals);
		const vertexNormal = this.getAttribLocation("vertexNormal_modelspace");
		gl.vertexAttribPointer(vertexNormal, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vertexNormal);

		gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.glBuffers.cubeElements);

		if (this.moveInProgress) {
			const moveRotMatrix = this.moveInProgress.getRotMatrix(time);
			if (moveRotMatrix) {
				gl.uniformMatrix4fv(this.getUniformLocation('uFaceRotMatrix'), false, moveRotMatrix);
			} else {
				this.moveInProgress.complete();
				this.moveInProgress = undefined;
			}
		}

		for (let x = 0; x !== 3; x++) {
			for (let y = 0; y !== 3; y++) {
				for (let z = 0; z !== 3; z++) {
					if (x === 0 || x === 2 || y === 0 || y === 2 || z === 0 || z === 2) {
						this.drawCubie(x, y, z);
					}
				}
			}
		}
	}

	drawCubie(x, y, z) {
		const moving = this.moveInProgress && this.moveInProgress.face.acceptCubie(x, y, z);
		this.gl.uniform1i(this.getUniformLocation('uMoving'), moving ? 1 : 0);

		for (const f in this.facets) {
			this.drawCubieFacet(this.facets[f], x, y, z);
		}
	}

	drawCubieFacet(facet, x, y, z) {
		facet.rotMatrix[12] = this.indexToCoordinate[x];
		facet.rotMatrix[13] = this.indexToCoordinate[y];
		facet.rotMatrix[14] = this.indexToCoordinate[z];

		const gl = this.gl;
		gl.uniform4fv(this.shaderProgram.uColor, this.color0);
		gl.uniformMatrix4fv(this.shaderProgram.uObjMatrix, false, facet.rotMatrix);
		gl.drawElements(gl.TRIANGLE_FAN, 6, gl.UNSIGNED_BYTE, 0);
		gl.drawElements(gl.TRIANGLE_FAN, 6, gl.UNSIGNED_BYTE, 6);
		gl.drawElements(gl.TRIANGLE_FAN, 6, gl.UNSIGNED_BYTE, 12);
		gl.drawElements(gl.TRIANGLE_FAN, 6, gl.UNSIGNED_BYTE, 18);

		const color = facet.getColor(x, y, z);
		if (color) {
			gl.uniform4fv(this.shaderProgram.uColor, color);
		}
		gl.drawElements(gl.TRIANGLE_FAN, 4, gl.UNSIGNED_BYTE, 24);
	}

	drawStep(time) {
		if (!this.shaderProgram) {
			return;
		}
		// 3D
		const gl = this.gl;
		const lPower = 20;
		const lightPosition = new Float32Array([this.lX, this.lY, -3]);
		gl.uniform3fv(this.getUniformLocation('LightPosition_worldspace'), lightPosition);
		gl.uniform1f(this.getUniformLocation('LightPower'), lPower);

		gl.uniformMatrix4fv(this.shaderProgram.uMVMatrix, false, this.mvMatrix);

		const rotMatrix = this.rotMatrix;
		const r0 = this.viewState.rotateMat0;
		const rotateLen = Math.hypot(this.viewState.rotateX, this.viewState.rotateY);
		if (rotateLen === 0) {
			rotMatrix.set(r0);
		} else {
			const angle = rotateLen * Math.PI / 400;
			const axis = {x: this.viewState.rotateY / rotateLen, y: this.viewState.rotateX / rotateLen};
			const cosR = Math.cos(angle);
			const sinR = Math.sin(angle);

			const r = [
				[cosR + (1 - cosR) * axis.x * axis.x, (1 - cosR) * axis.x * axis.y, sinR * axis.y],
				[(1 - cosR) * axis.x * axis.y, cosR + (1 - cosR) * axis.y * axis.y, -sinR * axis.x],
				[-sinR * axis.y, sinR * axis.x, cosR]
			];
			for (let i = 0; i !== 3; i++) {
				for (let j = 0; j !== 3; j++) {
					rotMatrix[j * 4 + i] = r[i].reduce((total, value, index) => total + r0[j * 4 + index] * value, 0);
				}
			}
		}

		gl.uniformMatrix4fv(this.getUniformLocation('uRotMatrix'), false, rotMatrix);

		// Rendering
		this.drawCube(time);
	}
	draw(time) {
		this.drawStep(time);
		window.requestAnimationFrame((t) => this.draw(t));
	}
	startMove(time, face, direction, amount) {
		this.moveInProgress = new MoveAnimation(time, this.moves[face], direction, amount);
	}
}
class MoveAnimation {
	constructor(time, face, direction, amount) {
		this.face = face;
		this.startTime = time;
		this.endTime = time + 600 * amount;
		if (!direction) {
			direction = Math.floor(Math.random() * 2) * 2 - 1;
		}
		this.amount = amount * direction;
		this.direction = direction;
	}
	getRotMatrix(time) {
		if (time >= this.endTime) {
			return undefined;
		}

		const moveRotMatrix = new Float32Array([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1]);
		const progress = time - this.startTime;
		this.face.faceRotator(moveRotMatrix, (progress % 2400) / 1200 * Math.PI * this.direction);
		return moveRotMatrix;
	}
	complete() {
		this.face.complete(this.amount);
	}
}

export default Animation;
