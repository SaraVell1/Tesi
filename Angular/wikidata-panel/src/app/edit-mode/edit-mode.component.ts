import { Component, OnInit, ViewContainerRef, ViewChild, ElementRef, AfterViewInit, Injector, ComponentRef, ComponentFactoryResolver, ChangeDetectorRef, HostListener } from '@angular/core';
import { EditedText } from '../edited-text';
import { ApiService } from '../api.service';
import { SafeHtml } from '@angular/platform-browser';
import { ClickableSpanComponent } from '../clickable-span/clickable-span.component';

@Component({
  selector: 'app-edit-mode',
  templateUrl: './edit-mode.component.html',
  styleUrls: ['./edit-mode.component.css']
})
export class EditModeComponent implements OnInit, AfterViewInit {

  inText: string = '';
  formattedText: SafeHtml = '';
  loading: boolean = false;
  value: number = 0;
  spanDataList: any[] = [];
  selectedSpanData: any = null;
  spanContainer: any;
  response: any;
  textFragments: any[] = [];
  dataL:string[] = [];
  spansSaved: boolean = false;
  highlightedText:string = '';
  addingNewSpan:boolean = false;
  editedContent: EditedText = {text: '', spans: []};
  private componentRef: ComponentRef<ClickableSpanComponent> | null = null;
  private dynamicComponentRef: ComponentRef<ClickableSpanComponent> | null = null;

  // @HostListener('document:mouseup', ['$event'])
  @ViewChild('spanContainer', {read: ViewContainerRef}) spans: ViewContainerRef | any;
  @ViewChild('formattedTextContainer', {static: true}) formattedTextContainer: ElementRef | any;

  constructor(private apiService:ApiService, private componentFactoryResolver: ComponentFactoryResolver, private injector: Injector, private cdr: ChangeDetectorRef){}

  ngOnInit(): void {
    this.apiService.spanData$.subscribe((spanData) => {
      console.log('Updated spanData:', spanData);
    });
    this.getResult();
  }
  

  ngAfterViewInit() {
    console.log("ngAfterViewInit called")
    if (this.response) {
      console.log("the response is arrived", this.response)
      this.formatText(this.inText, this.response);
    }  
  }

  getResult(){
    this.loading = true;
    this.inText = this.apiService.getText();
    this.apiService.getResponseSubject().subscribe((apiResponse)=> {
      this.response = apiResponse;
    this.formatText(this.inText, apiResponse);
      this.loading = false;
    })
  }

  formatText(text: string, response: any) {
    const flatResponse = response.flatMap((array: any) => array);
  
    const textFragments: (string | { type: string, text: string, data?: any })[] = [];
    let currentIndex = 0;
    let processedMatches: Set<string> = new Set(); // Keep track of processed matches
  
    flatResponse.forEach((item: any) => {
      if (item.Name && item.ID && item.Type && item.Candidates) {
        const name = item.Name;
        const namePattern = new RegExp(`\\b${name}\\b`, 'g');
        const spanData = {
          Name: item.Name,
          ID: item.ID,
          Type: item.Type,
          Candidates: item.Candidates,
        };
  
        const matches = text.match(namePattern);
        if (matches) {
          matches.forEach(match => {
            // Check if the match has been processed to avoid duplicates
            if (!processedMatches.has(match)) {
              const textBeforeSpan = text.slice(currentIndex, text.indexOf(match, currentIndex));
              if (textBeforeSpan) {
                textFragments.push({ type: 'text', text: textBeforeSpan });
              }
  
              textFragments.push({ type: 'span', text: match, data: spanData });
              currentIndex = text.indexOf(match, currentIndex) + match.length;
              processedMatches.add(match); // Mark the match as processed
            }
          });
        }
      }
    });
  
    const remainingText = text.slice(currentIndex);
    if (remainingText) {
      textFragments.push({ type: 'text', text: remainingText });
    }
  
    this.textFragments = textFragments;
  }
  
  getTextWithSpans(): string {
    return this.textFragments.map(fragment => {
      if (fragment.type === 'text') {
        return fragment.text;
      } else if (fragment.type === 'span') {
        return `<span class="mySpan">${fragment.text}</span>`;
      }
    }).join('');
  }
   
  handleSpanClick(spanData: any) {
    console.log('Span clicked:', spanData);
    this.selectedSpanData = spanData;

    const factory = this.componentFactoryResolver.resolveComponentFactory(ClickableSpanComponent);
    this.dynamicComponentRef = this.spans.createComponent(factory);
    
    if (this.dynamicComponentRef) {
      const dynamicComponent = this.dynamicComponentRef.instance;
      dynamicComponent.text = spanData.Name;
      dynamicComponent.dataId = spanData.ID;
      dynamicComponent.dataClass = spanData.Type;
      dynamicComponent.dataList = spanData.Candidates;
      dynamicComponent.openCard();

      dynamicComponent.updateSpan.subscribe((data: any) => {
        const index = this.textFragments.findIndex(fragment => fragment.type === 'span' && fragment.data === spanData);
      if (index !== -1) {
        this.textFragments[index] = { type: 'span', text: dynamicComponent.text, data: data };
      }
        if (this.componentRef) {
          this.componentRef.instance.dataList = data.dataList;
          this.componentRef.instance.selectedValue = data.dataList.length > 0 ? data.dataList[0] : '';
          this.componentRef.instance.dataId = data.dataId;
          this.componentRef.instance.dataClass = data.dataClass;
        }
        spanData.ID = data.dataId;
        spanData.Candidates = data.dataList;
        spanData.Type = data.dataClass;
        console.log('Update span data:', data);
        this.cdr.detectChanges();
      });
    
      this.spans.insert(this.dynamicComponentRef.hostView);
      if (this.componentRef) {
        this.componentRef.destroy();
      }
      this.componentRef = this.dynamicComponentRef;
    }
  }

  addNewSpan() {
    if (this.highlightedText) {
      // You can add additional logic if needed
      const newSpanData = { Name: this.highlightedText, ID: '', Candidates: [] };
      this.handleSpanClick(newSpanData);

      // Add the new span to textFragments
      this.textFragments.push({ type: 'span', text: this.highlightedText, data: newSpanData });

      // Reset highlighted text
      this.highlightedText = '';
    } else {
      this.addingNewSpan = true;
      this.highlightedText = ''; // Reset highlighted text
    }
  }
  
 
  highlightAndOpenCard(event: MouseEvent) {
    const selection = window.getSelection();
    if (selection) {
      const highlightedText = selection.toString();
      this.highlightedText = highlightedText;
      this.addingNewSpan = true;
    }
  }

  saveText(){
    const updatedSpans = this.textFragments
    .filter(fragment => fragment.type === 'span')
    .map(fragment => fragment.data);

  this.editedContent = {
    text: this.textFragments.map(fragment => fragment.text).join(''),
    spans: updatedSpans
  };

  this.apiService.setEditedContent(this.editedContent);

  console.log('The text has been saved!');
 
  }
}
