import { EventDataLoader } from '../event-data-loader';
import { Group, Object3D } from 'three';
import * as THREE from 'three';
import { UIService } from '../ui.service';
import { ThreeService } from '../three.service';
import { Cut } from '../extras/cut.model';
import { PhoenixObjects } from './objects/phoenix-objects';
import { InfoLoggerService } from '../infologger.service';
import { isArray } from 'util';

/**
 * Loader for processing and loading an event.
 */
export class PhoenixLoader implements EventDataLoader {
  /** ThreeService to perform three.js related functions. */
  private graphicsLibrary: ThreeService;
  /** UIService to perform UI related functions. */
  private ui: UIService;
  /** Event data processed by the loader. */
  private eventData: any;


  /**
   * Takes an object that represents ONE event and takes care of adding
   * the different objects to the graphic library and the UI controls.
   * @param eventData Object representing the event.
   * @param graphicsLibrary Service containing functionality to draw the 3D objects.
   * @param ui Service for showing menus and controls to manipulate the geometries.
   * @param infoLogger Service for logging data to the information panel.
   */
  public buildEventData(eventData: any, graphicsLibrary: ThreeService, ui: UIService, infoLogger: InfoLoggerService): void {
    this.graphicsLibrary = graphicsLibrary;
    this.ui = ui;
    this.eventData = eventData;

    // initiate load
    this.loadObjectTypes(eventData);

    const eventNumber = eventData['event number'] ? eventData['event number'] : eventData['eventNumber'];
    const runNumber = eventData['run number'] ? eventData['run number'] : eventData['runNumber'];
    infoLogger.add('Event#' + eventNumber + ' from run#' + runNumber, 'Loaded');
  }

  /**
   * Get the list of event names from the event data.
   * @param eventsData Object containing all event data.
   * @returns List of event names.
   */
  public getEventsList(eventsData: any): string[] {
    const eventsList: string[] = [];

    for (const eventName of Object.keys(eventsData)) {
      if (eventsData[eventName] !== null) {
        eventsList.push(eventName);
      }
    }

    return eventsList;
  }

  /**
   * Get list of collections in the event data.
   * @returns List of all collection names.
   */
  public getCollections(): string[] {
    if (!this.eventData) {
      return null;
    }

    const collections = [];
    for (const objectType of Object.keys(this.eventData)) {
      if (this.eventData[objectType] && typeof this.eventData[objectType] === 'object') {
        for (const collection of Object.keys(this.eventData[objectType])) {
          collections.push(collection);
        }
      }
    }
    return collections;
  }

  /**
   * Get the collection with the given collection name from the event data.
   * @param collectionName Name of the collection to get.
   * @returns An object containing the collection.
   */
  public getCollection(collectionName: string): any {
    if (!this.eventData) {
      return null;
    }

    for (const objectType of Object.keys(this.eventData)) {
      if (this.eventData[objectType]) {
        for (const collection of Object.keys(this.eventData[objectType])) {
          if (collection === collectionName) {
            return this.eventData[objectType][collection];
          }
        }
      }
    }
  }

  /**
   * Receives an object containing the data from an event and parses it
   * to reconstruct the different collections of physics objects.
   * @param eventData Representing ONE event (expressed in the Phoenix format).
   */
  protected loadObjectTypes(eventData: any) {
    if (eventData.Tracks) {
      // (Optional) Cuts can be added to any physics object.
      const cuts: Cut[] = [
        new Cut('chi2', 0, 50),
        new Cut('dof', 0, 100),
        new Cut('mom', 0, 500)
      ];

      this.addObjectType(eventData.Tracks, PhoenixObjects.getTrack, 'Tracks', cuts);
    }

    if (eventData.Jets) {
      // (Optional) Cuts can be added to any physics object.
      const cuts = [
        new Cut('phi', -Math.PI, Math.PI),
        new Cut('eta', 0, 100),
        new Cut('energy', 2000, 10000)
      ];

      const addJetsSizeOption = (typeFolder: any) => {
        const sizeMenu = typeFolder.add({ jetsScale: 100 }, 'jetsScale', 1, 200)
          .name('Jets Size (%)');
        sizeMenu.onChange((value: number) => {
          this.graphicsLibrary.getSceneManager().scaleJets(value);
        });
      };

      this.addObjectType(eventData.Jets, PhoenixObjects.getJet, 'Jets', cuts, addJetsSizeOption);
    }

    if (eventData.Hits) {
      this.addObjectType(eventData.Hits, PhoenixObjects.getHits, 'Hits');
    }

    if (eventData.CaloClusters) {
      // (Optional) Cuts can be added to any physics object.
      const cuts = [
        new Cut('phi', -Math.PI, Math.PI),
        new Cut('eta', 0, 100),
        new Cut('energy', 2000, 10000)
      ];

      this.addObjectType(eventData.CaloClusters, PhoenixObjects.getCluster, 'CaloClusters', cuts);
    }

    if (eventData.Muons) {
      this.addObjectType(eventData.Muons, this.getMuon, 'Muons');
    }
  }

  /**
   * Adds to the event display all collections of a given object type.
   * @param object Contains all collections of a given type (Tracks, Jets, CaloClusters...).
   * @param getObject Function that handles of reconstructing objects of the given type.
   * @param typeName Label for naming the object type.
   * @param cuts Filters that can be applied to the objects.
   * @param extendEventDataTypeUI A callback to add more options to event data type UI folder.
   */
  protected addObjectType(object: any, getObject: any, typeName: string,
    cuts?: Cut[], extendEventDataTypeUI?: (typeFolder: any) => void) {

    const typeFolder = this.ui.addEventDataTypeFolder(typeName, extendEventDataTypeUI);
    const objectGroup = this.graphicsLibrary.addEventDataTypeGroup(typeName);

    const collectionsList: string[] = this.getObjectTypeCollections(object);


    for (const collectionName of collectionsList) {
      const objectCollection = object[collectionName];

      this.addCollection(objectCollection, collectionName, getObject, objectGroup);

      cuts = cuts?.filter(cut => objectCollection[0][cut.field]);
      this.ui.addCollection(typeFolder, collectionName, cuts);
    }
  }

  /**
   * Adds to the event display all the objects inside a collection.
   * @param objectCollection Contains the params for every object of the collection.
   * @param collectionName Label to UNIQUELY identify the collection.
   * @param getObject Handles reconstructing the objects of the objects of the collection.
   * @param objectGroup Group containing the collections of the same object type.
   */
  private addCollection(
    objectCollection: any, collectionName: string,
    getObject: (object: any) => Object3D, objectGroup: Group) {
    const collscene = new THREE.Group();
    collscene.name = collectionName;

    for (const objectParams of objectCollection) {
      const object = getObject.bind(this)(objectParams);
      if (object) {
        collscene.add(object);
      }
    }

    objectGroup.add(collscene);
  }

  /**
   * Get collection names of a given object type.
   * @param object Contains all collections of a given type (Tracks, Jets, CaloClusters etc.).
   * @returns List of collection names of an object type (Tracks, Jets, CaloClusters etc.).
   */
  private getObjectTypeCollections(object: any): string[] {
    const collectionsList: string[] = [];

    for (const collectionName of Object.keys(object)) {
      if (object[collectionName] !== null) {
        collectionsList.push(collectionName);
      }
    }

    return collectionsList;
  }

  /**
   * Process the Muon from the given parameters and get it as a group.
   * @param muonParams Parameters of the Muon.
   * @returns Muon group containing Clusters and Tracks.
   */
  protected getMuon(muonParams: any): Object3D {
    const muonScene = new Group();

    for (const clusterID of muonParams.LinkedClusters) {
      const clusterColl = clusterID.split(':')[0];
      const clusterIndex = clusterID.split(':')[1];

      if (clusterColl && clusterIndex && this.eventData.CaloClusters && this.eventData.CaloClusters[clusterColl]) {
        const clusterParams = this.eventData.CaloClusters[clusterColl][clusterIndex];
        if (clusterParams) {
          const cluster = PhoenixObjects.getCluster(clusterParams);
          muonScene.add(cluster);
        }
      }
    }

    for (const trackID of muonParams.LinkedTracks) {
      const trackColl = trackID.split(':')[0];
      const trackIndex = trackID.split(':')[1];

      if (trackColl && trackIndex && this.eventData.Tracks && this.eventData.Tracks[trackColl]) {
        const trackParams = this.eventData.Tracks[trackColl][trackIndex];
        if (trackParams) {
          const track = PhoenixObjects.getTrack(trackParams);
          muonScene.add(track);
        }
      }
    }
    // uuid for selection of muons from the collections info panel
    muonParams.uuid = muonScene.uuid;
    muonScene.name = 'Muon';
    // add to scene
    return muonScene;
  }

  /**
   * Convert event data to new JSON data format that uses parameters for defining
   * types and arrays for collection data.
   * @param allEventsData Event data in old JSON format.
   */
  public static convertEventDataToNewFormat(allEventsData: any) {
    for (const eventDataKey of Object.keys(allEventsData)) {
      const eventData = allEventsData[eventDataKey];

      if (eventData) {
        for (const objectType of Object.keys(eventData)) {
          if (typeof eventData[objectType] === 'object' && !isArray(objectType)) {
            // Iterating through each collection
            for (const collection of Object.keys(eventData[objectType])) {
              // Got the collection

              let newCollectionData = [];
              let objectTypeCollection = eventData[objectType][collection];
              eventData[objectType][collection] = {};
              
              // Getting types by using the keys of the collection's first object
              eventData[objectType][collection]['parameters'] = Object.keys(objectTypeCollection[0]);

              // Processing each object in the collection and pushing object data to collection array
              for (const collectionObject of objectTypeCollection) {
                let singleCollectionObject = [];
                // Going through each type in order
                for (const type of eventData[objectType][collection]['parameters']) {
                  singleCollectionObject.push(collectionObject[type]);
                }
                newCollectionData.push(singleCollectionObject);
              }

              // Setting the new array as collection data
              eventData[objectType][collection]['data'] = newCollectionData;
            }
          }
        }
      }
    }

    // Code for downloading
    // const link = document.createElement('a');
    // link.href = URL.createObjectURL(new Blob([JSON.stringify(allEventsData, null, 2)]));
    // link.download = 'newEventData.json';
    // link.style.display = 'none';
    // document.body.appendChild(link);
    // link.click();
    // link.remove();
  }

  /**
   * Convert event data to the JSON format Phoenix framework uses.
   * @param allEventsData Event data in the new JSON format.
   * @returns JSON containing event data in Phoenix format.
   */
  public static convertEventDataToPhoenixFormat(allEventsData: any): any {
    for (const eventDataKey of Object.keys(allEventsData)) {
      const eventData = allEventsData[eventDataKey];
      for (const objectType of Object.keys(eventData)) {
        if (typeof eventData[objectType] === 'object' && !isArray(eventData[objectType])) {
          for (const collection of Object.keys(eventData[objectType])) {
            const collectionParameters = eventData[objectType][collection]['parameters'];
            
            let newCollectionData = [];
            for (const collectionObject of eventData[objectType][collection]['data']) {
              let newCollectionObject = {};

              // If the collection object is an array (Hits)
              if (isArray(collectionObject[0])) {
                newCollectionObject = [];
              }
              collectionParameters.forEach((parameter, index) => {
                newCollectionObject[parameter] = collectionObject[index];
              });
              newCollectionData.push(newCollectionObject);
            }
            eventData[objectType][collection] = newCollectionData;
          }
        }
      }
    }
    return allEventsData;
  }

  /**
   * Get metadata associated to the event (experiment info, time, run, event...).
   * @returns Metadata of the event.
   */
  getEventMetadata(): any[] {
    let metadata = [];

    // Dividing event meta data into groups by keys and label 
    // For example, the first array group is for "Run / Event / LS"
    const eventDataPropGroups = [
      [
        { keys: ['runNumber', 'run number'], label: 'Run' },
        { keys: ['eventNumber', 'event number'], label: 'Event' },
        { keys: ['ls'], label: 'LS' }
      ],
      [
        { keys: ['time'], label: 'Data recorded' }
      ]
    ];

    const eventDataKeys = Object.keys(this.eventData);

    // Iterating the group
    for (const eventDataPropGroup of eventDataPropGroups) {
      let combinedProps = {};
      // Iterating the props inside a group
      for (const eventDataProp of eventDataPropGroup) {
        // Iterating each possible key of a prop
        for (const eventDataPropKey of eventDataProp.keys) {
          if (eventDataKeys.includes(eventDataPropKey) && this.eventData[eventDataPropKey]) {
            combinedProps[eventDataProp.label] = this.eventData[eventDataPropKey];
            break;
          }
        }
      }
      if (Object.keys(combinedProps).length > 0) {
        // Joining and pushing the collected combined properties to the actual metadata
        metadata.push({
          label: Object.keys(combinedProps).join(' / '),
          value: Object.values(combinedProps).join(' / ')
        });
      }
    }

    return metadata;
  }

}
