import React, { Component, SetStateAction } from 'react';
import { remote, ipcMain, ipcRenderer } from 'electron';
import { ServiceCollection } from '@/common/serviceCollection';
import style from './directoryView.scss';
import { FileService } from '@/main/services/file.service';
import { db } from '@/common/nedb';
import { extractDirUrlFromKey, extractSuffixFromKey } from '@/common/utils';
import { command } from '@/common/constant/command.constant';
import { eventConstant } from '@/common/constant/event.constant';
import { EventHub } from '@/common/eventHub';
import { ITreeDataNode, DirectoryTree } from './directoryTree/directoryTree';
import { serviceConstant } from '@/common/constant/service.constant';

export interface IDirectoryViewProps {
    initPath?: string;
}

export interface IDirectoryViewState {
    treeData: ITreeDataNode[];
    lastSelectedNode: string;
}

export interface IDirectoryStore {
    url: string;
}

export class DirectoryView extends Component<any, IDirectoryViewState> {
    constructor(props: any) {
        super(props);
    }

    state: IDirectoryViewState = {
        treeData: [],
        lastSelectedNode: ''
    };

    componentDidMount() {
        this.initIpc();
        this.autoImportDir();
    }

    initIpc() {
        ipcRenderer.on(command.OPEN_DIR_BY_IMPORT, (event: Electron.IpcRendererEvent, data: { autoImport: boolean; tree: ITreeDataNode }) => {
            if (!data.autoImport) db.directory.insert({ url: extractDirUrlFromKey(data.tree.key) });
            this.setState({
                treeData: this.state.treeData.slice(0).concat(data.tree)
            });
        });
    }

    async autoImportDir() {
        const serviceCollection: ServiceCollection = remote.getGlobal(serviceConstant.SERVICE_COLLECTION);
        const fileService: FileService = serviceCollection.get(serviceConstant.FILE);

        const dirs: string[] = (await db.directory.find({}).exec()).map((item: any) => item.url);
        dirs.forEach(dir => {
            fileService.openDirByImport(dir, true);
        });
    }

    onSelect(
        keys: string[],
        event: {
            event: 'select';
            selected: boolean;
            node: ITreeDataNode;
            selectedNodes: ITreeDataNode[];
            nativeEvent: MouseEvent;
        }
    ) {
        const serviceCollection: ServiceCollection = remote.getGlobal(serviceConstant.SERVICE_COLLECTION);
        const fileService: FileService = serviceCollection.get(serviceConstant.FILE);

        const key: string = keys[0];
        this.setState({ lastSelectedNode: key });

        const url = extractDirUrlFromKey(key);
        EventHub.emit(eventConstant.LOAD_PICTURE_BY_SELECT_DIR, url);
    }

    async onLoadData(treeNode: ITreeDataNode): Promise<void> {
        return new Promise(resolve => {
            if (treeNode.children) {
                resolve();
                return;
            }
            const node = treeNode;
            const serviceCollection: ServiceCollection = remote.getGlobal(serviceConstant.SERVICE_COLLECTION);
            const fileService: FileService = serviceCollection.get(serviceConstant.FILE);

            fileService.loadDir(extractDirUrlFromKey(node.key), { level: 1, keySuffix: extractSuffixFromKey(node.key) }).then(loadedTree => {
                treeNode.children = loadedTree.children || [];

                this.setState({
                    treeData: [...this.state.treeData]
                });
                resolve();
            });
        });
    }

    render(): JSX.Element {
        return (
            <div className={`${style.dirTreeWrapper} medium-scrollbar`}>
                <DirectoryTree
                    className={style.dirTree}
                    onSelect={this.onSelect.bind(this)}
                    treeData={this.state.treeData}
                    loadData={this.onLoadData.bind(this) as (treeNode: ITreeDataNode) => Promise<void>}
                />
            </div>
        );
    }
}