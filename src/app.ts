import { Component, inject, signal } from '@angular/core';
import { CONTACT } from './site.config';
import { FEATURED_ROOMS, ROOMS } from './rooms';
import { LOCATIONS } from './locations';
import { IconComponent } from './icon';
import { GOOGLE_REVIEWS } from './reviews';
import { I18nService } from './i18n.service';
import { LangSwitcherComponent } from './lang-switcher';

@Component({ selector: 'app-root', standalone: true, imports: [IconComponent, LangSwitcherComponent], templateUrl: './app.html' })
export class AppComponent {
  readonly i18n = inject(I18nService);
  readonly contact = CONTACT;
  readonly year = new Date().getFullYear();
  readonly menuOpen = signal(false);
  readonly photos = ROOMS;
  readonly featuredPhotos = FEATURED_ROOMS;
  readonly locations = LOCATIONS;
  readonly reviews = GOOGLE_REVIEWS;
  readonly showAll = signal(false);
  readonly preferredLocation = signal('');
  readonly showSelectionSummary = signal(false);
  readonly ethnicityOptions = ['Chinese', 'Indian', 'Malay', 'Others'];
  readonly selectedEthnicity = signal('');
  readonly roomTypes = ['Single Room', 'Common Room', 'Balcony Room', 'Window Room', 'Master Room', 'Others'];
  readonly formError = signal('');
  readonly invalidMoveInDate = signal(false);
  get todayDate(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  readonly preferredRoomTypes = signal<string[]>([]);
  closeMenu(): void { this.menuOpen.set(false); }
  chooseLocation(location: string): void {
    this.preferredLocation.set(location);
    this.showSelectionSummary.set(true);
    this.clearMessage();
  }
  chooseRoomType(type: string): void {
    if (!this.roomTypes.includes(type)) return;
    this.preferredRoomTypes.set([type]);
    this.showSelectionSummary.set(true);
    this.clearMessage();
  }
  toggleRoomType(type: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.preferredRoomTypes();
    if (checked) {
      this.preferredRoomTypes.set([...current, type]);
    } else {
      this.preferredRoomTypes.set(current.filter(t => t !== type));
    }
    this.clearMessage();
  }
  clearMessage(): void { this.formError.set(''); }
  validateMoveInDate(input: HTMLInputElement): boolean {
    input.min = this.todayDate;
    const invalid = !!input.value && input.value < input.min;
    this.invalidMoveInDate.set(invalid);
    // Some mobile date pickers allow dates before min. Reject them explicitly.
    if (invalid) input.value = '';
    return !invalid;
  }
  prepareEnquiry(event: Event, form: HTMLFormElement): void {
    event.preventDefault();
    this.clearMessage();
    const dateInput = form.elements.namedItem('moveInDate') as HTMLInputElement;
    if (!this.validateMoveInDate(dateInput)) {
      dateInput.focus();
      return;
    }
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const name = String(data.get('tenantName') ?? '').trim().replace(/\s+/g, ' ');
    const types = data.getAll('roomTypes').map(String).filter(type => this.roomTypes.includes(type));
    const occupants = Number(data.get('occupants'));
    const monthlyBudget = Number(data.get('monthlyBudget'));
    const location = String(data.get('location') ?? '');
    const moveInDate = String(data.get('moveInDate') ?? '').trim();
    const carPark = String(data.get('carPark') ?? '');
    const motorcycle = String(data.get('motorcycle') ?? '');
    const ethnicityChoice = String(data.get('ethnicity') ?? '');
    const ethnicity = ethnicityChoice === 'Others'
      ? String(data.get('otherEthnicity') ?? '').trim().replace(/\s+/g, ' ')
      : ethnicityChoice;
    if (!name || !types.length || !Number.isSafeInteger(occupants) || occupants < 1 || !location) {
      this.formError.set(this.i18n.t(!name ? 'error.name' : !types.length ? 'error.roomType' : 'error.occupants'));
      return;
    }
    if (!Number.isSafeInteger(monthlyBudget) || monthlyBudget < 1) {
      this.formError.set(this.i18n.t('error.budget'));
      return;
    }
    if (!moveInDate) {
      this.formError.set(this.i18n.t('error.moveIn'));
      return;
    }
    if (!['Yes', 'No', 'Not sure yet'].includes(carPark) || !['Yes', 'No'].includes(motorcycle)) {
      this.formError.set(this.i18n.t('error.parking'));
      return;
    }
    if (!this.ethnicityOptions.includes(ethnicityChoice) || !ethnicity) {
      this.formError.set(this.i18n.t(ethnicityChoice === 'Others' ? 'error.ethnicity.specify' : 'error.ethnicity.choose'));
      return;
    }
    const message = `Hi Nest & Nook! I would like to enquire about a room rental.\n\nName: ${name}\nPreferred room types: ${types.join(', ')}\nNumber of people: ${occupants}\nMonthly budget: RM ${monthlyBudget.toLocaleString('en-MY')}\nPreferred location: ${location}\nMove-in date: ${moveInDate}\nCar parking needed: ${carPark}\nHave a motorcycle: ${motorcycle}\nRace / ethnicity: ${ethnicity}\n\nCould you share suitable rooms, current prices and availability? Thank you!`;
    window.location.assign(`https://wa.me/${this.contact.whatsappNumber}?text=${encodeURIComponent(message)}`);
  }
}
