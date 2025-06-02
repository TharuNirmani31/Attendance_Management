import { TestBed } from '@angular/core/testing';

import { DynamoDbService } from './dynamodb.service';

describe('DynamodbService', () => {
  let service: DynamoDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DynamoDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
