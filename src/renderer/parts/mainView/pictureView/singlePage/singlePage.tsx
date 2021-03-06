import * as React from 'react';
import style from './singlePage.scss';
import { page } from '../../mainView';
import { picture, ISwitchPageEvent } from '../pictureView';
import { isNumber } from '@/common/utils/types';
import { isVideo, encodeChar } from '@/common/utils/businessTools';
import { hintMainText, hintText, openNotification } from '@/renderer/utils/tools';
import { WithTranslation, withTranslation } from 'react-i18next';

export interface ISinglePageState {
    isDragging: boolean;
    lockRatio: boolean;
    lockPosition: boolean;
}

export interface ISinglePageProps extends WithTranslation {
    page: page;
    currentShowIndex: number;
    onSwitchPage(e: ISwitchPageEvent): void;
    isShow: boolean;
}

class SinglePage extends React.PureComponent<ISinglePageProps & WithTranslation, ISinglePageState> {
    private readonly scaleContainerRef: React.RefObject<HTMLDivElement>;
    input: string;

    zoomLevel: number;
    mouseLeft: number;
    mouseTop: number;
    x: number;
    y: number;

    constructor(props: ISinglePageProps) {
        super(props);
        this.scaleContainerRef = React.createRef();

        this.x = 0;
        this.y = 0;
        this.zoomLevel = 1;
        this.mouseLeft = 0;
        this.mouseTop = 0;

        this.state = {
            isDragging: false,
            lockRatio: false,
            lockPosition: false
        };
        this.input = '';
    }

    componentDidUpdate(prevProps: ISinglePageProps, prevState: ISinglePageState) {
        this.hintText();
        const t = this.props.t;

        const pageNum = this.props.page.data.length;
        const curPage = this.props.currentShowIndex;

        if (prevProps.currentShowIndex === pageNum - 1 && curPage === 0) {
            openNotification(t('%isLastPage%'));
        }
        else if (prevProps.currentShowIndex === 0 && curPage === pageNum - 1) {
            openNotification(t('%isFirstPage%'));
        }

        if (prevState.lockRatio !== this.state.lockRatio) {
            openNotification(this.state.lockRatio ? t('%scaleRatioIsLock%') : t('%scaleRatioIsRelease%'), '', { closeOtherNotification: false });
        }

        if (prevState.lockPosition !== this.state.lockPosition) {
            openNotification(this.state.lockPosition ? t('%positionIsLock%') : t('%positionIsRelease%'), '', { closeOtherNotification: false });
        }
    }

    componentDidMount() {
        this.initEvent();
    }

    initEvent() {
        document.addEventListener('keydown', this.handleKeydown);
        document.addEventListener('mouseup', this.stopDrag);
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleKeydown);
        document.removeEventListener('mouseup', this.stopDrag);
    }

    stopDrag = () => {
        this.setState({
            isDragging: false
        });
    }

    resetSize = () => {
        if (!this.state.lockRatio) this.zoomLevel = 1;

        if (!this.state.lockPosition) {
            this.x = 0;
            this.y = 0;
        }

        const el = this.scaleContainerRef.current;
        el.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.zoomLevel})`;
    }

    handleWheel = (e: React.WheelEvent) => {
        const t = this.props.t;

        this.getMousePosition(e);
        if (e.deltaY > 0) {
            if (e.ctrlKey || e.buttons === 2) this.zoomOut();
            else {
                this.props.onSwitchPage({ delta: 1 });
                this.resetSize();
            }
        } else if (e.deltaY < 0) {
            if (e.ctrlKey || e.buttons === 2) this.zoomIn();
            else {
                this.props.onSwitchPage({ delta: -1 });
                this.resetSize();
            }
        }
    }

    handleKeydown = (e: KeyboardEvent) => {
        if (!this.props.isShow) return;

        if ([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].includes(Number(e.key))) {
            this.input += e.key;
        } else if (e.key === 'ArrowRight') {
            this.props.onSwitchPage({ delta: 1 });
            this.resetSize();
        } else if (e.key === 'ArrowLeft') {
            this.props.onSwitchPage({ delta: -1 });
            this.resetSize();
        } else if (e.key === 'Enter') {
            const nextPage = parseInt(this.input);
            if (!isNumber(nextPage)) return;
            this.input = '';
            this.props.onSwitchPage({ goto: nextPage });
            this.resetSize();
        }
        else if (e.key === '+') this.zoomIn();
        else if (e.key === '-') this.zoomOut();
        else if (e.key === '*') this.setState({ lockRatio: !this.state.lockRatio });
        else if (e.key === '/') this.setState({ lockPosition: !this.state.lockPosition });
    }

    zoomIn = () => {
        const newZoomLevel = this.zoomLevel * Math.sqrt(2);
        this.zoom(newZoomLevel);
    }

    zoomOut = () => {
        const newZoomLevel = this.zoomLevel / Math.sqrt(2);
        this.zoom(newZoomLevel);
    }

    zoom = (newZoomLevel: number) => {
        const el = this.scaleContainerRef.current;
        const elRect = this.scaleContainerRef.current.getBoundingClientRect();
        const elHeight = elRect.height;
        const elWidth = elRect.width;

        // get scale ratio
        const xScale = (this.mouseLeft - this.x) / elWidth;
        const yScale = (this.mouseTop - this.y) / elHeight;

        // the init width/height of scaleContainer
        const initWidth = elWidth / this.zoomLevel;
        const initHeight = elHeight / this.zoomLevel;

        // the width/height of scaleContainer after zoomIn/zoomOut
        const ampWidth = initWidth * newZoomLevel;
        const ampHeight = initHeight * newZoomLevel;

        // compute translate distance
        const x = xScale * (ampWidth - elWidth);
        const y = yScale * (ampHeight - elHeight);

        el.style.transform = `translate(${this.x - x}px, ${this.y - y}px) scale(${newZoomLevel})`;

        this.x -= x;
        this.y -= y;
        this.zoomLevel = newZoomLevel;
    }

    handleMouseMove = (e: React.MouseEvent) => {
        if (this.state.isDragging && e.buttons === 1) {
            const newX = this.x + e.movementX;
            const newY = this.y + e.movementY;
            this.x = newX;
            this.y = newY;

            const el = this.scaleContainerRef.current;
            el.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.zoomLevel})`;
        }
        this.getMousePosition(e);
    }

    getMousePosition = (e: React.MouseEvent | React.WheelEvent) => {
        // get the mouse position relative to scaleContainer's parent element
        const pEl = this.scaleContainerRef.current.parentElement;
        const pElRect = pEl.getBoundingClientRect();
        const pElTop = pElRect.y || 0;
        const pElLeft = pElRect.x || 0;

        this.mouseLeft = e.clientX - pElLeft;
        this.mouseTop = e.clientY - pElTop;
    }

    handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) this.setState({ isDragging: true });
    }

    hintText = () => {
        hintText(this.getHintText());
    }

    getHintText = () => {
        const t = this.props.t;
        const curPage = this.props.currentShowIndex + 1;
        const totalPage = this.props.page.data.length;

        return [
            {
                text: `/ ${t('%or%')} *`,
                color: 'rgb(255, 0, 200)',
                margin: 4
            },
            {
                text: t('锁定图片位置或缩放比例'),
                margin: 24
            },
            {
                text: t('%wheelClick%'),
                color: 'rgb(255, 0, 200)',
                margin: 4
            },
            {
                text: t('%fullscreenAndSwitchUI%'),
                margin: 24
            },
            {
                text: t('%zoomKey%'),
                color: 'rgb(255, 0, 200)',
                margin: 4
            },
            {
                text: t('%zoom%'),
                margin: 24
            },
            {
                text: t('%inputAnyNumberAndEnter%'),
                color: 'rgb(255, 0, 200)',
                margin: 4
            },
            {
                text: t('%jumpToPage%'),
                margin: 24
            },
            {
                text: `${curPage} / ${totalPage}`
            }
        ];
    }

    render(): JSX.Element {
        const imgSrc = (this.props.page.data as picture[])[this.props.currentShowIndex].url;
        const t = this.props.t;

        return (
            <div
                className={style.singlePageWrapper}
                style={{ cursor: this.state.isDragging ? 'grabbing' : 'default' }}
                onMouseDown={this.handleMouseDown}
                onMouseMove={this.handleMouseMove}
                onMouseEnter={this.hintText}
                onMouseLeave={() => { hintText([{ text: t('%openSettingDesc%'), color: 'rgb(255, 0, 200)', margin: 4 }, { text: t('%openSetting%') }]); }}
                onWheel={this.handleWheel}
            >
                <div className={style.scaleContainer} ref={this.scaleContainerRef}>
                    {
                        isVideo(imgSrc)
                            ? <video src={encodeChar(imgSrc)} loop autoPlay muted></video>
                            : (<img
                                src={encodeChar(imgSrc)}
                                alt=''
                                draggable={false}
                            />)
                    }
                </div>
            </div>
        );
    }
}

const singlePage = withTranslation()(SinglePage);
export { singlePage as SinglePage };