import { Component, OnInit } from '@angular/core';
import { EventdisplayService } from '../../services/eventdisplay.service';
import { Configuration } from '../../services/extras/configuration.model';
import { PresetView } from '../../services/extras/preset-view.model';
import { HttpClient } from '@angular/common/http';


@Component({
  selector: 'app-atlas',
  templateUrl: './atlas.component.html',
  styleUrls: ['./atlas.component.scss']
})
export class AtlasComponent implements OnInit {

  constructor(private eventDisplay: EventdisplayService, private http: HttpClient) {
  }

  ngOnInit() {

    const configuration = new Configuration();
    configuration.presetViews = [
      new PresetView('Left View', [0, 0, -12000], 'left-cube'),
      new PresetView('Center View', [-500, 12000, 0], 'top-cube'),
      new PresetView('Right View', [0, 0, 12000], 'right-cube')
    ];

    this.eventDisplay.init(configuration);
    this.http.get('assets/files/event_data/atlaseventdump2.json')
      .subscribe((res: any) => this.eventDisplay.parsePhoenixEvents(res));
    this.eventDisplay.loadJSONGeometry('assets/geometry/ATLAS/json/Pixel.json', 'Pixel', 1000);
    this.eventDisplay.loadJSONGeometry('assets/geometry/ATLAS/json/SCT_BAR.json', 'SCT_BAR', 1000);
    this.eventDisplay.loadJSONGeometry('assets/geometry/ATLAS/json/SCT_EC.json', 'SCT_EC', 1000);
    this.eventDisplay.loadJSONGeometry('assets/geometry/ATLAS/json/TRT_BAR.json', 'TRT_BAR', 1000);
    this.eventDisplay.loadJSONGeometry('assets/geometry/ATLAS/json/TRT_EC.json', 'TRT_EC', 1000);
  }
}
