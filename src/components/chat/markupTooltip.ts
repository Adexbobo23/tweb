import type { AppImManager } from "../../lib/appManagers/appImManager";
import { MarkdownType, cancelEvent, getSelectedNodes, markdownTags, findUpClassName } from "../../helpers/dom";
import RichTextProcessor from "../../lib/richtextprocessor";
import ButtonIcon from "../buttonIcon";

export default class MarkupTooltip {
  public container: HTMLElement;
  private wrapper: HTMLElement;
  private buttons: {[type in MarkdownType]: HTMLElement} = {} as any;
  private linkBackButton: HTMLElement;
  private hideTimeout: number;
  private addedListener = false;
  private waitingForMouseUp = false;
  private linkInput: HTMLInputElement;
  private savedRange: Range;

  constructor(private appImManager: AppImManager) {

  }

  private init() {
    this.container = document.createElement('div');
    this.container.classList.add('markup-tooltip', 'z-depth-1', 'hide');

    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('markup-tooltip-wrapper');
    
    const tools1 = document.createElement('div');
    const tools2 = document.createElement('div');
    tools1.classList.add('markup-tooltip-tools');
    tools2.classList.add('markup-tooltip-tools');

    const arr = ['bold', 'italic', 'underline', 'strikethrough', 'monospace', 'link'] as (keyof MarkupTooltip['buttons'])[];
    arr.forEach(c => {
      const button = ButtonIcon(c, {noRipple: true});
      tools1.append(this.buttons[c] = button);

      if(c !== 'link') {
        button.addEventListener('click', () => {
          this.appImManager.chat.input.applyMarkdown(c);
        });
      } else {
        button.addEventListener('click', () => {
          this.container.classList.add('is-link');

          if(button.classList.contains('active')) {
            const startContainer = this.savedRange.startContainer;
            const anchor = startContainer.parentElement as HTMLAnchorElement;
            this.linkInput.value = anchor.href;
          } else {
            this.linkInput.value = '';
          }
        });
      }
    });

    this.linkBackButton = ButtonIcon('back', {noRipple: true});
    this.linkInput = document.createElement('input');
    this.linkInput.placeholder = 'Enter URL...';
    this.linkInput.classList.add('input-clear');
    this.linkInput.addEventListener('keydown', (e) => {
      if(e.code == 'Enter') {
        const valid = !this.linkInput.value.length || RichTextProcessor.matchUrl(this.linkInput.value);///^(http)|(https):\/\//i.test(this.linkInput.value);
        if(!valid) {
          if(this.linkInput.classList.contains('error')) {
            this.linkInput.classList.remove('error');
            void this.linkInput.offsetLeft; // reflow
          }

          this.linkInput.classList.add('error');
        } else {
          cancelEvent(e);
          this.resetSelection();
          this.appImManager.chat.input.applyMarkdown('link', this.linkInput.value);
          this.hide();
        }
      } else {
        this.linkInput.classList.remove('error');
      }
    });

    this.linkBackButton.addEventListener('click', () => {
      this.container.classList.remove('is-link');
      //input.value = '';
      this.resetSelection();
    });
    
    const delimiter1 = document.createElement('span');
    const delimiter2 = document.createElement('span');
    delimiter1.classList.add('markup-tooltip-delimiter');
    delimiter2.classList.add('markup-tooltip-delimiter');
    tools1.insertBefore(delimiter1, this.buttons.link);
    tools2.append(this.linkBackButton, delimiter2, this.linkInput);
    //tools1.insertBefore(delimiter2, this.buttons.link.nextSibling);

    this.wrapper.append(tools1, tools2);
    this.container.append(this.wrapper);
    document.body.append(this.container);
  }

  private resetSelection() {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(this.savedRange);
    this.appImManager.chat.input.messageInput.focus();
  }

  public hide() {
    if(this.init) return;

    this.container.classList.remove('is-visible');
    document.removeEventListener('mouseup', this.onMouseUp);
    if(this.hideTimeout) clearTimeout(this.hideTimeout);
    this.hideTimeout = window.setTimeout(() => {
      this.hideTimeout = undefined;
      this.container.classList.add('hide');
      this.container.classList.remove('is-link');
    }, 200);
  }

  public getActiveMarkupButton() {
    const nodes = getSelectedNodes();
    const parents = [...new Set(nodes.map(node => node.parentNode))];
    if(parents.length > 1) return undefined;

    const node = parents[0] as HTMLElement;
    let currentMarkup: HTMLElement;
    for(const type in markdownTags) {
      const tag = markdownTags[type as MarkdownType];
      if(node.matches(tag.match)) {
        currentMarkup = this.buttons[type as MarkdownType];
        break;
      }
    }

    return currentMarkup;
  }

  public setActiveMarkupButton() {
    const activeButton = this.getActiveMarkupButton();

    for(const i in this.buttons) {
      // @ts-ignore
      const button = this.buttons[i];
      if(button != activeButton) {
        button.classList.remove('active');
      }
    }

    if(activeButton) {
      activeButton.classList.add('active');
    }

    return activeButton;
  }

  public show() {
    if(this.init) {
      this.init();
      this.init = null;
    }

    const selection = document.getSelection();

    if(!selection.toString().trim().length) {
      this.hide();
      return;
    }

    if(this.hideTimeout !== undefined) {
      clearTimeout(this.hideTimeout);
    }

    const range = this.savedRange = selection.getRangeAt(0);

    const activeButton = this.setActiveMarkupButton();
    
    this.container.classList.remove('is-link');
    const isFirstShow = this.container.classList.contains('hide');
    if(isFirstShow) {
      this.container.classList.remove('hide');
      this.container.classList.add('no-transition');
    }
    
    const selectionRect = range.getBoundingClientRect();
    //const containerRect = this.container.getBoundingClientRect();
    const sizesRect = this.container.firstElementChild.firstElementChild.getBoundingClientRect();
    const top = selectionRect.top - sizesRect.height - 8;
    const left = selectionRect.left + (selectionRect.width - sizesRect.width) / 2;
    //const top = selectionRect.top - 44 - 8;
    
    this.container.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    
    if(isFirstShow) {
      void this.container.offsetLeft; // reflow
      this.container.classList.remove('no-transition');
    }
    
    this.container.classList.add('is-visible');

    //console.log('selection', selectionRect, activeButton);
  }

  private onMouseUp = (e: Event) => {
    if(findUpClassName(e.target, 'markup-tooltip')) return;
    this.hide();
    document.removeEventListener('mouseup', this.onMouseUp);
  };

  public setMouseUpEvent() {
    if(this.waitingForMouseUp) return;
    this.waitingForMouseUp = true;
    document.addEventListener('mouseup', (e) => {
      this.waitingForMouseUp = false;
      this.show();

      document.addEventListener('mouseup', this.onMouseUp);
    }, {once: true});
  }

  public handleSelection() {
    if(this.addedListener) return;
    this.addedListener = true;
    document.addEventListener('selectionchange', (e) => {
      if(document.activeElement == this.linkInput) {
        return;
      }

      if(document.activeElement != this.appImManager.chat.input.messageInput) {
        this.hide();
        return;
      }

      const selection = document.getSelection();

      if(!selection.toString().trim().length) {
        this.hide();
        return;
      }

      this.setMouseUpEvent();
    });
  }
}