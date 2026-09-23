import { Component, signal } from '@angular/core';
import { CONTACT } from './site.config';
import { ROOMS } from './rooms';
import { LOCATIONS } from './locations';
import { IconComponent } from './icon';
import { GOOGLE_REVIEWS } from './reviews';

@Component({ selector: 'app-root', standalone: true, imports: [IconComponent], templateUrl: './app.html' })
export class AppComponent {
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
    const carPark = String(data.get('carPark') ?? '');
    const motorcycle = String(data.get('motorcycle') ?? '');
    const ethnicityChoice = String(data.get('ethnicity') ?? '');
    const ethnicity = ethnicityChoice === 'Others'
      ? String(data.get('otherEthnicity') ?? '').trim().replace(/\s+/g, ' ')
      : ethnicityChoice;
    if (!name || !types.length || !Number.isSafeInteger(occupants) || occupants < 1 || !location) {
      this.formError.set(!name ? 'Please enter your name.' : !types.length ? 'Please choose at least one room type, or choose Others.' : 'Please enter a whole number of people and choose a location.');
      return;
    }
    if (!['Yes', 'No', 'Not sure yet'].includes(carPark) || !['Yes', 'No'].includes(motorcycle)) {
      this.formError.set('Please answer the car parking and motorcycle questions.');
      return;
    }
    if (!this.ethnicityOptions.includes(ethnicityChoice) || !ethnicity) {
      this.formError.set(ethnicityChoice === 'Others' ? 'Please specify your race / ethnicity.' : 'Please choose your race / ethnicity.');
      return;
    }
    const message = `Hi Nest & Nook! I would like to enquire about a room rental.\n\nName: ${name}\nPreferred room types: ${types.join(', ')}\nNumber of people: ${occupants}\nPreferred location: ${location}\nCar parking needed: ${carPark}\nHave a motorcycle: ${motorcycle}\nRace / ethnicity: ${ethnicity}\n\nCould you share suitable rooms, current prices and availability? Thank you!`;
    window.location.assign(`https://wa.me/${this.contact.whatsappNumber}?text=${encodeURIComponent(message)}`);
  }
}
