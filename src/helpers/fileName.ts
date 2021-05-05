/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import type { InputFileLocation, InputStickerSet } from "../layer";
import type { DownloadOptions } from "../lib/mtproto/apiFileManager";

export function getFileNameByLocation(location: InputFileLocation, options?: Partial<{
  fileName: string
}>) {
  const fileName = '';//(options?.fileName || '').split('.');
  const ext = fileName[fileName.length - 1] || '';

  switch(location._) {
    case 'inputPhotoFileLocation':
    case 'inputDocumentFileLocation': {
      const thumbPart = location.thumb_size ? '_' + location.thumb_size : '';
      return (fileName[0] ? fileName[0] + '_' : '') + location.id + thumbPart + (ext ? '.' + ext : ext);
    }

    case 'inputPeerPhotoFileLocation':
      return ['peerPhoto', location.photo_id, location.pFlags.big ? 'big' : 'small'].join('_');
    
    case 'inputStickerSetThumb': {
      const id = (location.stickerset as InputStickerSet.inputStickerSetID).id || 
        (location.stickerset as InputStickerSet.inputStickerSetShortName).short_name || 
        (location.stickerset as InputStickerSet.inputStickerSetDice).emoticon || 
        location.stickerset._;
      return ['stickerSetThumb', id, location.thumb_version].join('_');
    }

    case 'inputFileLocation': {
      return location.volume_id + '_' + location.local_id + (ext ? '.' + ext : ext);
    }

    default: {
      console.error('Unrecognized location:', location);
      return '';
    }
  }
}

export type FileURLType = 'photo' | 'thumb' | 'document' | 'stream' | 'download';
export function getFileURL(type: FileURLType, options: DownloadOptions) {
  //console.log('getFileURL', location);
  //const perf = performance.now();
  const encoded = encodeURIComponent(JSON.stringify(options));
  //console.log('getFileURL encode:', performance.now() - perf, encoded);

  return '/' + type + '/' + encoded;
}
