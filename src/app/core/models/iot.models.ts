export interface Sensor {
  thingName: string;
  company: string;
}

export interface ListThingsResponse {
  company: string;
  things: Sensor[];
  totalCount: number;
  nextToken?: string;
  hasMore: boolean;
}