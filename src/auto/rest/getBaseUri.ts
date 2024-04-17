/**
 * Das Modul besteht aus der Controller-Klasse für Lesen an der REST-Schnittstelle.
 * @packageDocumentation
 */

import { AutoReadService } from '../service/auto-read.service.js';
import { type Request } from 'express';
import { nodeConfig } from '../../config/node.js';

const port = `:${nodeConfig.port}`;

export const getBaseUri = ({ protocol, hostname, url }: Request) => {
    // Query-String entfernen, falls vorhanden
    let basePath = url.includes('?') ? url.slice(0, url.lastIndexOf('?')) : url;

    // ID entfernen, falls der Pfad damit endet
    const indexLastSlash = basePath.lastIndexOf('/');
    if (indexLastSlash > 0) {
        const idStr = basePath.slice(indexLastSlash + 1);
        if (AutoReadService.ID_PATTERN.test(idStr)) {
            basePath = basePath.slice(0, indexLastSlash);
        }
    }

    return `${protocol}://${hostname}${port}${basePath}`;
};
