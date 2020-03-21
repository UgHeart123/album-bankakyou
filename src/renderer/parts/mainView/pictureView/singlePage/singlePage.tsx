import * as React from 'react';
import style from './singlePage.scss';
import { page } from '../../mainView';
import { picture } from '../pictureView';
import { isNumber } from '@/common/types';

export interface ISinglePageState {
    x: number;
    y: number;
    zoomLevel: number;
}

export interface ISinglePageProps {
    page: page;
    currentShowIndex: number;
    onSwitchPage(e: ISwitchPageEvent): void;
}

export interface ISwitchPageEvent {
    delta?: number;
    goto?: number;
}

export class SinglePage extends React.PureComponent<ISinglePageProps, ISinglePageState> {
    input: string;
    isDragging: boolean;

    constructor(props: ISinglePageProps) {
        super(props);

        this.state = {
            x: 0,
            y: 0,
            zoomLevel: 0
        };
        this.input = '';
        this.isDragging = false;
    }

    componentDidMount() {
        document.addEventListener('mouseup', this.stopDrag);
    }

    componentWillUnmount() {
        document.removeEventListener('mouseup', this.stopDrag);
    }

    stopDrag = () => {
        this.isDragging = false;
    }

    resetSize = () => {
        this.setState({
            x: 0,
            y: 0,
            zoomLevel: 0
        });
    }

    handleWheel = (e: React.WheelEvent) => {
        if (e.deltaY > 0) {
            if (e.ctrlKey) {
                const zoomLevel = this.state.zoomLevel - 1;
                this.setState({
                    zoomLevel
                });
            }
            else {
                this.props.onSwitchPage({ delta: 1 });
                this.resetSize();
            }
        }
        else if (e.deltaY < 0) {
            if (e.ctrlKey) {
                const zoomLevel = this.state.zoomLevel + 1;
                this.setState({
                    zoomLevel
                });
            }
            else {
                this.props.onSwitchPage({ delta: -1 });
                this.resetSize();
            }
        }
    }

    handleKeydown = (e: React.KeyboardEvent) => {
        if ([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].includes(Number(e.key))) {
            this.input += e.key;
        }
        else if (e.key === 'ArrowRight') {
            this.props.onSwitchPage({ delta: 1 });
            this.resetSize();
        }
        else if (e.key === 'ArrowLeft') {
            this.props.onSwitchPage({ delta: -1 });
            this.resetSize();
        }
        else if (e.key === 'Enter') {
            const nextPage = Number(this.input);
            if (!isNumber(nextPage)) return;
            this.input = '';
            this.props.onSwitchPage({ goto: nextPage });
            this.resetSize();
        }
        else if (e.key === '+') {
            const zoomLevel = this.state.zoomLevel + 1;
            this.setState({
                zoomLevel
            });
        }
        else if (e.key === '-') {
            const zoomLevel = this.state.zoomLevel - 1;
            this.setState({
                zoomLevel
            });
        }
    }

    handleMouseMove = (e: React.MouseEvent) => {
        if (this.isDragging) {
            const newX = this.state.x + e.movementX;
            const newY = this.state.y + e.movementY;

            this.setState({
                x: newX,
                y: newY
            });
        }
    }

    render(): JSX.Element {
        const imgSrc = (this.props.page.data as picture[])[this.props.currentShowIndex].url;
        const zoomLevel = this.state.zoomLevel;
        let imgZoom = (2 ** (zoomLevel - 1)) * 2;
        imgZoom = imgZoom <= 0 ? 0 : imgZoom;

        return <div className={style.singlePageWrapper}
            style={{ cursor: this.isDragging ? 'grabbing' : 'grab' }}
            onMouseDown={() => { this.isDragging = true; }}
            onMouseMove={this.handleMouseMove}
            onWheel={this.handleWheel}
            onKeyDown={this.handleKeydown} tabIndex={3}>
            <div className={style.translateWrapper} style={{ transform: `translate(${this.state.x}px, ${this.state.y}px)` }}>
                <img src={imgSrc} alt='' draggable={false} style={{ transform: `scale(${imgZoom})` }} />
            </div>
        </div>;
    }
}