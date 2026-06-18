export * from './types';
import { registerAdapter } from './types';
import { wechatVideoDownloader } from './wechat-video-downloader';
import { mamaPraiseMe } from './mama-praise-me';
import { aiforkids } from './aiforkids';

// 多别名注册：CMS/CLI 可能用 code 或 repo name
registerAdapter(wechatVideoDownloader);
registerAdapter({ ...wechatVideoDownloader, id: 'wechat-video-downloader', code: 'wechat-video-downloader' });
registerAdapter({ ...wechatVideoDownloader, id: 'wechatvideodownloader', code: 'wechatvideodownloader' });

registerAdapter(mamaPraiseMe);
registerAdapter({ ...mamaPraiseMe, id: 'MamaPraiseMe', code: 'MamaPraiseMe' });

registerAdapter(aiforkids);
registerAdapter({ ...aiforkids, id: 'aiforkids', code: 'aiforkids' });
registerAdapter({ ...aiforkids, id: 'wonderlearn', code: 'wonderlearn' });
