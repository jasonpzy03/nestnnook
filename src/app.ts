import { Component, inject, signal } from '@angular/core';
import { CONTACT } from './site.config';
import { ROOMS } from './rooms';
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
  readonly locations = LOCATIONS;
  readonly reviews = GOOGLE_REVIEWS;
  readonly showAll = signal(false);
  readonly preferredLocation = signal('');
  readonly ethnicityOptions = ['Chinese', 'Indian', 'Malay', 'Others'];
  readonly selectedEthnicity = signal('');
  readonly roomTypes = ['Single Room', 'Common Room', 'Balcony Room', 'Window Room', 'Master Room', 'Others'];
  readonly formError = signal('');
  readonly todayDate = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  closeMenu(): void { this.menuOpen.set(false); }
  chooseLocation(location: string): void { this.preferredLocation.set(location); this.clearMessage(); }
  clearMessage(): void { this.formError.set(''); }
  prepareEnquiry(event: Event, form: HTMLFormElement): void {
    event.preventDefault();
    this.clearMessage();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const name = String(data.get('tenantName') ?? '').trim().replace(/\s+/g, ' ');
    const types = data.getAll('roomTypes').map(String).filter(type => this.roomTypes.includes(type));
    const occupants = Number(data.get('occupants'));
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
    const message = `Hi Nest & Nook! I would like to enquire about a room rental.\n\nName: ${name}\nPreferred room types: ${types.join(', ')}\nNumber of people: ${occupants}\nPreferred location: ${location}\nMove-in date: ${moveInDate}\nCar parking needed: ${carPark}\nHave a motorcycle: ${motorcycle}\nRace / ethnicity: ${ethnicity}\n\nCould you share suitable rooms, current prices and availability? Thank you!`;
    window.location.assign(`https://wa.me/${this.contact.whatsappNumber}?text=${encodeURIComponent(message)}`);
  }
}
