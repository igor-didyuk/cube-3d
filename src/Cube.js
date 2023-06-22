import './Cube.css';
import { useEffect } from 'react';
import React from 'react';
import Animation from './rcube'
import vertShader from './rcube.vert'
import fragShader from './rcube.frag'
import MoveButton from './MoveButton'

function Cube() {
    const glCanvasRef = React.createRef();
    const animation = React.useRef();
    let rotationInProgress = false;

    const renderScene = time => {
        if (time !== undefined) {
            animation.current.drawStep(time);
        }
        requestAnimationFrame(renderScene);
    }
    const moveLight = event => {
		const canvasRect = glCanvasRef.current.getBoundingClientRect();
		animation.current.lX = ((event.pageX - canvasRect.x) * 2 / canvasRect.width - 1) * 25;
		animation.current.lY = - ((event.pageY - canvasRect.y) * 2 / canvasRect.height - 1) * 25;
    }
    const rotateSceneStart = event => {
        animation.current.rotateSceneStart(event.clientX, event.clientY);
		event.target.setPointerCapture(event.pointerId);
        rotationInProgress = true;
    }
    const rotateScene = event => {
        if (rotationInProgress) {
            animation.current.rotateScene(event.clientX, event.clientY);
        }
    }
    const rotateSceneFinish = event => {
        rotationInProgress = false;
		event.target.releasePointerCapture(event.pointerId);
        animation.current.rotateSceneFinish();
    }
    const zoomScene = event => {
        event.preventDefault();
        animation.current.zoomScene(event.deltaY);
    }
    useEffect(() => {
        console.log("Use effect");
        if (!animation.current) {
            animation.current = new Animation(glCanvasRef.current, vertShader, fragShader);
            renderScene();
        }
    }, [glCanvasRef, React.useCallback(renderScene)])
  return (
    <div className="plot">
        <canvas id="gl3d" width="800px" height="800px"
                onMouseMove={moveLight}
                onPointerDown={rotateSceneStart}
                onPointerMove={rotateScene}
                onPointerUp={rotateSceneFinish}
                onWheel={zoomScene}
                ref={glCanvasRef}></canvas>
        <div className="control">
            <div>
                <MoveButton animation={animation} face="F" direction="1" amount="1" name="F" />
                <MoveButton animation={animation} face="F" direction="-1" amount="1" name="F'" />
                <MoveButton animation={animation} face="F" amount="2" name="F''" />
            </div>
            <div>
                <MoveButton animation={animation} face="B" direction="1" amount="1" name="B" />
                <MoveButton animation={animation} face="B" direction="-1" amount="1" name="B'" />
                <MoveButton animation={animation} face="B" amount="2" name="B''" />
            </div>
            <div>
                <MoveButton animation={animation} face="U" direction="1" amount="1" name="U" />
                <MoveButton animation={animation} face="U" direction="-1" amount="1" name="U'" />
                <MoveButton animation={animation} face="U" amount="2" name="U''" />
            </div>
            <div>
                <MoveButton animation={animation} face="D" direction="1" amount="1" name="D" />
                <MoveButton animation={animation} face="D" direction="-1" amount="1" name="D'" />
                <MoveButton animation={animation} face="D" amount="2" name="D''" />
            </div>
            <div>
                <MoveButton animation={animation} face="L" direction="1" amount="1" name="L" />
                <MoveButton animation={animation} face="L" direction="-1" amount="1" name="L'" />
                <MoveButton animation={animation} face="L" amount="2" name="L''" />
            </div>
            <div>
                <MoveButton animation={animation} face="R" direction="1" amount="1" name="R" />
                <MoveButton animation={animation} face="R" direction="-1" amount="1" name="R'" />
                <MoveButton animation={animation} face="R" amount="2" name="R''" />
            </div>
        </div>
    </div>);
}

export default Cube;
