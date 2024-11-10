import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

export class DynamoDBService {
    private readonly dbClient: DynamoDBClient;

    constructor() {
        this.dbClient = new DynamoDBClient({region: 'ap-southeast-2'})
    }

    async writeItem<T>(item: T): Promise<void> {
        const params = {
            TableName: 'volcanic-lightning-history',
            Item: marshall(item),
        };

        try {
            await this.dbClient.send(new PutItemCommand(params));
        } catch (error) {
            console.error('Error putting item:', error);
            throw error;
        }
  }
}