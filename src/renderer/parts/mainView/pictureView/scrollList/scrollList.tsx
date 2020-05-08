import * as React from 'react';
import style from './scrollList.scss';
import { page } from '../../mainView';
import { picture } from '../pictureView';
import LazyLoad from '@arisageha/react-lazyload-fixed';
import * as ReactDOM from 'react-dom';
import { encodeChar } from '@/common/utils/businessTools';
import { db } from '@/common/nedb';

export type scrollModeDirection = 'TB' | 'BT' | 'LR' | 'RL';

export interface IScrollListState {
    scrollModeDirection: scrollModeDirection;
    isDragging: boolean;
}

export interface IScrollListProps {
    page: page;
    currentShowIndex: number;
    isShow: boolean;
}

export class ScrollList extends React.PureComponent<IScrollListProps, IScrollListState> {
    private readonly scrollListRef: React.RefObject<HTMLDivElement>;
    private readonly scaleContainerRef: React.RefObject<HTMLDivElement>;
    private lastDirection: scrollModeDirection = 'LR';

    mouseLeft: number;
    mouseTop: number;
    zoomLevel: number;

    constructor(props: IScrollListProps) {
        super(props);
        this.scrollListRef = React.createRef();
        this.scaleContainerRef = React.createRef();
        this.mouseLeft = 0;
        this.mouseTop = 0;
        this.zoomLevel = 100;

        this.state = {
            scrollModeDirection: 'LR',
            isDragging: false
        };
    }

    async componentDidMount() {
        this.initEvent();
        const urlData: any = await db.directory.findOne({ url: this.props.page.id });
        const scrollModeDirection = urlData?.scrollModeDirection || 'LR';

        this.setState({
            scrollModeDirection,
            isDragging: false
        });
    }

    componentWillUnmount() {
        this.removeEvent();
    }

    componentDidUpdate() {
        const el = this.scrollListRef.current;
        if (this.state.scrollModeDirection !== this.lastDirection) {
            if (this.state.scrollModeDirection === 'RL') el.scrollLeft = el.scrollWidth;
            else if (this.state.scrollModeDirection === 'LR') el.scrollLeft = 0;
            else if (this.state.scrollModeDirection === 'TB') el.scrollTop = 0;
            else if (this.state.scrollModeDirection === 'BT') el.scrollTop = el.scrollHeight;

            this.lastDirection = this.state.scrollModeDirection;
        }
    }

    initEvent() {
        document.addEventListener('keydown', this.handleKeydown);
        document.addEventListener('mouseup', this.stopDrag);
        this.scrollListRef.current.addEventListener('wheel', this.handleWheel, { passive: false });
    }

    stopDrag = () => {
        this.setState({
            isDragging: false
        });
    }

    removeEvent() {
        document.removeEventListener('keydown', this.handleKeydown);
        document.removeEventListener('mouseup', this.stopDrag);
        this.scrollListRef.current.removeEventListener('wheel', this.handleWheel);
    }

    handleKeydown = (e: KeyboardEvent) => {
        if (!this.props.isShow) return;
        let scrollModeDirection: scrollModeDirection = this.state.scrollModeDirection;
        let zoomLevel = this.zoomLevel;

        if (['2', '4', '6', '8'].includes(e.key)) {
            if (e.key === '2') scrollModeDirection = 'TB';
            else if (e.key === '8') scrollModeDirection = 'BT';
            else if (e.key === '4') scrollModeDirection = 'RL';
            else if (e.key === '6') scrollModeDirection = 'LR';

            db.directory.update(
                { url: this.props.page.id },
                { $set: { scrollModeDirection } },
                { upsert: true }
            );
        }
        else if (e.key === '+') zoomLevel *= Math.sqrt(2);
        else if (e.key === '-') zoomLevel /= Math.sqrt(2);

        this.zoomLevel = zoomLevel;
        this.setState({ scrollModeDirection });
    }

    handleWheel = (e: WheelEvent) => {
        e.preventDefault();

        let zoomLevel = this.zoomLevel;
        const prevZoomLevel = this.zoomLevel;

        if (e.ctrlKey || e.buttons === 2) {
            if (e.deltaY < 0) zoomLevel *= Math.sqrt(2);
            else if (e.deltaY > 0) zoomLevel /= Math.sqrt(2);
            this.zoomLevel = zoomLevel;

            const scaleRatio = zoomLevel / prevZoomLevel;

            const scrollEl = this.scrollListRef.current;
            const processHorizontal = scrollEl.scrollLeft / scrollEl.scrollWidth;
            const processVertical = scrollEl.scrollTop / scrollEl.scrollHeight;

            const scaleEl = this.scaleContainerRef.current;
            scaleEl.style.transform = `scale(${zoomLevel / 100})`;

            scrollEl.scrollLeft = (processHorizontal * scrollEl.scrollWidth);
            scrollEl.scrollTop = (processVertical * scrollEl.scrollHeight);
        }
        else {
            if (this.isHorizontal()) {
                e.shiftKey ?
                    this.scrollListRef.current.scrollTop += e.deltaY
                    : this.scrollListRef.current.scrollLeft += e.deltaY;
            }
            else {
                e.shiftKey
                    ? this.scrollListRef.current.scrollLeft += e.deltaY
                    : this.scrollListRef.current.scrollTop += e.deltaY;
            }
        }
    }

    handleMouseMove = (e: React.MouseEvent) => {
        if (this.state.isDragging) {
            this.scrollListRef.current.scrollTop -= e.movementY * 5;
            this.scrollListRef.current.scrollLeft -= e.movementX * 5;
        }

        // const tabsWrapper = document.querySelector('#tabsWrapper');
        // const tabsWrapperHeight = !this.props.isFullscreen ?
        //     tabsWrapper?.getBoundingClientRect()?.height || 0
        //     : 0;
        // this.mouseTop = e.clientY - tabsWrapperHeight;

        // const layoutLeft = document.querySelector('#layoutLeft');
        // const layoutLeftWidth = !this.props.isFullscreen ?
        //     layoutLeft?.getBoundingClientRect()?.width || 0
        //     : 0;

        // this.mouseLeft = e.clientX - layoutLeftWidth;
    }

    getViewerStyle(): React.CSSProperties {
        const scrollModeDirection = this.state.scrollModeDirection;
        const flexDirection = scrollModeDirection === 'TB' ? 'column' : scrollModeDirection === 'BT' ? 'column-reverse' : scrollModeDirection === 'LR' ? 'row' : 'row-reverse';
        return this.isVertical()
            ? { width: '100%', justifyContent: 'center', flexDirection }
            : { height: '100%', whiteSpace: 'nowrap', flexDirection, justifyContent: scrollModeDirection === 'LR' ? 'flex-start' : 'flex-end' };
    }

    getImgStyle(): React.CSSProperties {
        return this.isVertical() ? { maxWidth: '100%', alignSelf: 'center' } : { maxHeight: '100%', alignSelf: 'flex-end' };
    }

    render(): JSX.Element {
        const album = this.props.page.data as picture[];
        const placeholder = <span style={{ display: 'inline-block', minWidth: '120px', minHeight: '120px' }}></span>;

        const viewerStyle = this.getViewerStyle();
        const imgStyle = this.getImgStyle();

        const Album = album.map(picture =>
            <LazyLoad scrollContainer={`#scrollListContainer`} overflow offset={150} placeholder={placeholder} once key={picture.id}>
                <img draggable={false} src={encodeChar(picture.url)} alt='' style={imgStyle} />
            </LazyLoad>
        );

        return <div
            ref={this.scrollListRef}
            className={`${style.scrollListWrapper} large-scrollbar`}
            onMouseDown={(e: React.MouseEvent) => { this.setState({ isDragging: true }); }}
            onMouseMove={this.handleMouseMove}
            style={{ cursor: this.state.isDragging ? 'grabbing' : 'default' }}
            id={`scrollListContainer`}>
            <div className={style.scaleContainer} ref={this.scaleContainerRef}>
                <div className={style.scrollListViewer} style={viewerStyle}>
                    {Album}
                </div>
            </div>
        </div>;
    }

    isHorizontal() {
        return ['LR', 'RL'].includes(this.state.scrollModeDirection);
    }

    isVertical() {
        return ['TB', 'BT'].includes(this.state.scrollModeDirection);
    }

    isReverse() {
        return ['BT', 'RL'].includes(this.state.scrollModeDirection);
    }
}
