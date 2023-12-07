import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { InfoService } from '../info.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-panel-data',
  templateUrl: './panel-data.component.html',
  styleUrls: ['./panel-data.component.css']
})
export class PanelDataComponent implements OnInit, AfterViewInit{

  @Output() closePanel = new EventEmitter<any>();
  type:string = '';
  entityName:string = '';
  entityImage:string='';
  entityInfo:any;
  res:any;
  keys: string[] = [];
  constructor(private infoService: InfoService, private cdr:ChangeDetectorRef){}

  ngOnInit(){
    
  }

  ngAfterViewInit(){
    this.getEntityInformation();
    this.cdr.detectChanges();
  }

  getEntityInformation(){
   const entityData = this.infoService.getEntityData();
   if(entityData){
    this.type = entityData.type;
    this.entityInfo = entityData.data;
    this.createPanel();
   }else{
    console.log("EntityData is empty");
   }
  }

  createPanel(){
    console.log("Sono nel create Panel");
      this.keys = Object.keys(this.entityInfo);
      this.entityName = this.entityInfo['Name'];
      return this.keys;
  }
  close(){
    this.closePanel.emit(false);
  }
}