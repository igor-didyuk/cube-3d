import './MoveButton.css';

function MoveButton(props) {
    const startMove = event => {
        props.animation.current.startMove(event.timeStamp, props.face, props.direction, props.amount);
    }
    return (<button className={`move face${props.face}`} onClick={startMove}>{props.name}</button>);
}

export default MoveButton;
