import EventsList from '../view/events-list.js';
import Plug from '../view/plug.js';
import Sorting from '../view/sorting.js';
import { SortType, PlugText, UpdateType, UserAction } from '../utils-constants/constants.js';
import PointPresenter from './point-presenter.js';
import { sortBy } from '../utils-constants/sort.js';
import { render, remove } from '../framework/render.js';

export default class PagePresenter {
  #eventsListContainer = null;
  #pointsModel = null;
  #sorting = null;

  #eventsListPoints = [];
  #sourcedPoints = [];

  #pointPresenters = new Map();
  #currentSortType = SortType.DAY;

  #eventsListComponent = new EventsList();
  #listEmpty = new Plug(PlugText.EVERYTHING);

  constructor({eventsListContainer, pointsModel}) {
    this.#eventsListContainer = eventsListContainer;
    this.#pointsModel = pointsModel;

    this.#pointsModel.addObserver(this.#handleModelEvent);
  }

  get points() {
    switch (this.#currentSortType) {
      case 'time':
        [...this.#pointsModel.points].sort(sortBy.Time);
        break;
      case 'price':
        [...this.#pointsModel.points].sort(sortBy.Price);
        break;
    }

    return [...this.#pointsModel.points].sort(sortBy.Day);
  }

  init() {
    this.#eventsListPoints = [...this.#pointsModel.points].sort(sortBy.Day);
    this.#sourcedPoints = [...this.#pointsModel.points];
    this.#renderPage();
  }

  #renderPoint(point) {
    const pointPresenter = new PointPresenter({
      eventsListComponent: this.#eventsListComponent.element,
      pointsModel: this.#pointsModel,
      onDataChange: this.#handleViewAction,
      onModeChange: this.#handleModeChange,
    });
    pointPresenter.init(point);
    this.#pointPresenters.set(point.id, pointPresenter);
  }

  #renderPoints(points) {
    points.forEach((point) => this.#renderPoint(point));
  }

  #renderListEmpty() {
    render(this.#listEmpty, this.#eventsListContainer);
  }

  #renderSorting() {
    this.#sorting = new Sorting({
      checkedSortType: this.#currentSortType,
      onSortTypeChange: this.#handleSortTypeChange
    });
    render(this.#sorting, this.#eventsListContainer);
  }

  #renderEventsList() {
    render(this.#eventsListComponent, this.#eventsListContainer);
    this.#renderPoints(this.points);
  }

  #renderPage() {

    if (this.points.length === 0) {
      this.#renderListEmpty();
      return;
    }
    this.#renderSorting();
    this.#renderEventsList();
  }

  #clearPage({resetSortType = false} = {}) {
    this.#pointPresenters.forEach((presenter) => presenter.destroy());
    this.#pointPresenters.clear();

    remove(this.#sorting);
    remove(this.#listEmpty);

    if (resetSortType) {
      this.#currentSortType = SortType.DAY;
    }
  }


  #handleModeChange = () => {
    this.#pointPresenters.forEach((presenter) => presenter.resetView());
  };

  #handleViewAction = (actionType, updateType, update) => {
    switch (actionType) {
      case UserAction.UPDATE_POINT:
        this.#pointsModel.updateTask(updateType, update);
        break;
      case UserAction.ADD_POINT:
        this.#pointsModel.addTask(updateType, update);
        break;
      case UserAction.DELETE_POINT:
        this.#pointsModel.deleteTask(updateType, update);
        break;
    }
  };

  #handleModelEvent = (updateType, data) => {
    switch (updateType) {
      case UpdateType.PATCH:
        this.#pointPresenters.get(data.id).init(data);
        break;
      case UpdateType.MINOR:
        this.#clearPage();
        this.#renderPage();
        break;
      case UpdateType.MAJOR:
        this.#clearPage({resetSortType: true});
        this.#renderPage();
        break;
    }
  };

  #handleSortTypeChange = (sortType) => {
    if (this.#currentSortType === sortType) {
      return;
    }

    this.#currentSortType = sortType;
    this.#clearPage();
    this.#renderPage();
  };
}
