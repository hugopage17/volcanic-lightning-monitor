import axios from 'axios';
import moment from 'moment';

export interface Properties {
    number?: string
    name?: string
    area?: string
    twentyKmStrikes?: number
    hundredKmStrikes?: number
    volcanoType?: string
    severity?: string
}

export interface Feature {
    type: string;
    geometry: {
        type: string;
        coordinates: number[];
    };
    properties: Properties;
};

export default class LightningScraper {
    static async scrape() {
        const webScraperRequest = await axios.get(process.env.VOLCANIC_LIGHTNING_URL!);

        const features = webScraperRequest.data.split('</tr>')
            .map((row: string) => {
                const columns = row.split('\n');
                const header = columns.find((i) => i.includes('<tr')) as string;
                if (header) {
                    const tableData = columns.filter((i) => i.includes('<td'));
                    const alertRow = header.includes('alert') || header.includes('inner');

                    return tableData.reduce(
                        (acc, curr, index) => {
                        const entry = curr.replace('<td>', '').replace('</td>', '');
                        if (alertRow) {
                            acc['properties']['severity'] = header.includes('alert') ? 'error' : 'warning';                 
                            switch (index) {
                                case 1:
                                    acc['properties']['name'] = entry;
                                    break;
                                case 2:
                                    acc['properties']['area'] = entry;
                                    break;
                                case 3:
                                    acc['properties']['volcanoType'] = entry;
                                    break;
                                case 4:
                                    acc['geometry']['coordinates'] = [Number(entry)];
                                    break;
                                case 5:
                                    acc['geometry']['coordinates'] = [
                                        ...(acc['geometry']['coordinates'] ?? []),
                                        Number(entry),
                                    ];
                                    break;
                                case 6:
                                    acc['properties']['twentyKmStrikes'] = Number(entry);
                                    break;
                                case 7:
                                    acc['properties']['hundredKmStrikes'] = Number(entry);
                                    break;
                            }
                        }

                        return acc;
                        },
                        {
                            type: 'Feature',
                            properties: {},
                            geometry: { type: 'Point', coordinates: [] },
                        } as Feature
                    )
                }
            }).filter((feature: Feature) => !!feature?.properties?.twentyKmStrikes && !!feature?.properties?.hundredKmStrikes)

        return {
            pk: 'FEATURE_COLLECTION',
            sk: moment().format('YYYYMMDDTHHmmss'),
            type: 'FeatureCollection',
            features,
            timestamp: moment().toISOString(),
            TTL: new Date(moment().add(60, 'minutes').toISOString()).getTime() / 1000
        };
    }
}
