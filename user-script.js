
$ = jQuery.noConflict();
let app_api = 'https://script.google.com/macros/s/AKfycbztS8iY_30Qz-yO-nEW8QYLJutUFZmvuvlZ2Ek8pOYMC1WCDk73pJuiSyY9M5q1SXO4vg/exec'
let DB
let TIMER
$(document).ready(function () {

    fetch(app_api + '?action=readall', {method: 'GET'})
    .then(r => r.json())
    .then(res => {
        console.log(res)
        DB = res
        
        let team_id = localStorage['lwa_team_id']
        let team_data = DB.TEAMS.find(i => i.ID == team_id)

        $('.participant').removeClass('_loading')
        console.log(team_data)
        
        if(team_data){
            $('#price_section').removeClass('hidden')
        } else {
            $('body').addClass('registration_phase')
            $('#registration_section').removeClass('hidden')
            localStorage['lwa_team_id'] = ""                    
        }

        $('#register-form label').addClass('*:bg-transparent *:border-none *:outline-none bg-stone-100 flex m-1 ring-1 ring-stone-200 rounded-lg')
        $('#register-form input').addClass('p-3')

        $(document).on('click', '[data-trigger]', function(e){
            e.preventDefault()
            let value = $(this).attr('data-trigger')
            let $content_container = $(`[data-content="${value}"]`)
            $('[data-trigger]').removeClass('active')
            $(this).addClass('active')
            $('[data-content]').addClass('hidden')
            $content_container.removeClass('hidden')                
        })

        updatePriceList(DB)
        checkStage(res)
        syncApp(5000)
        
    })

    let $register_form = $('#register-form')
    $register_form.on('submit', function(e){
        e.preventDefault()

        let $submit_btn = $(this).find('button[type="submit"]')
        $submit_btn.addClass('_loading')
        let company = $(this).find('[name="company_name"]').val()
        let participants = []
        $(this).find('[name="team_member"]').each(function(){
            participants.push($(this).val())
        })

        console.log('registration triggered')
        let data = {
            'COMPANY': company,
            'PARTICIPANTS': participants}

        let query = new URL(app_api)
        query.searchParams.append('action', 'insert')
        query.searchParams.append('data', JSON.stringify(data))

        fetch(query, {method: 'GET'})
        .then(r => r.json())
        .then(res => {
            if(res.success){
                alert('Registration successfull')
                $('#registration_section').addClass('hidden')
                $('#price_section').removeClass('hidden')
                localStorage['lwa_team_id'] = res.data.ID
                $('body').removeClass('registration_phase')
                $('.before_start_loader').removeClass('hidden')

            } else {
                alert('something went wrong')
            }
            $submit_btn.removeClass('_loading')
        })
        .catch(err => {
            alert(err)
        })

    })

    let $submit_price_form = $('#price-form')

    $submit_price_form.on('submit', function (e) {
        e.preventDefault()
        let $this = $(this)

        let $submit_btn = $this.find('button[type="submit"]')
        $submit_btn.addClass('_loading')
        let team_id = localStorage['lwa_team_id']
        let price = $this.find('[name="price"]:checked').val()

        let data = {
            'PRICE': price
        }

        let query = new URL(app_api)
        query.searchParams.append('action', 'update')
        query.searchParams.append('table', 'TEAMS')
        query.searchParams.append('id', team_id)
        query.searchParams.append('data', JSON.stringify(data))

        fetch(query, { method: 'GET' })
            .then(r => r.json())
            .then(res => {
                console.log(res)
                DB.TEAMS = res.db
                if (res.success) {
                    localStorage['timerStartTime'] = new Date()

                    updatePriceList(DB)
                    checkStage(DB)
                    alert('update successfull')
                    $this[0].reset()

                        let prices = jsonParse(res.data.PRICE)
                        if(prices.length) {
                        if(prices.length == 3 || prices.length == 7) {
                            $this.addClass('_loading')
                        }
                    }

                } else {
                    alert('something went wrong')
                }
                $submit_btn.removeClass('_loading')
            })
            .catch(err => {
                alert(err)
            })

    })

})

function syncApp(delay = 500){

    function fetchData(){
        fetch(app_api + '?action=readall', {method: 'GET'})
        .then(r => r.json())
        .then(res => {
            
            DB = res
            updatePriceList(DB)
            checkStage(res)
        })
    }

    setInterval(fetchData, delay);
}


function updatePriceList(db){
    let team_id = localStorage['lwa_team_id']
    let team_data = db.TEAMS.find(i => i.ID == team_id)
    if(!team_data) return
    let team_price = jsonParse(team_data.PRICE)
    let pair_id = team_data.PAIR
    let vs_team_data = db.TEAMS.find(i => i.PAIR == pair_id && i.ID != team_id )

    $('.your_team_name').text(team_data?.COMPANY)
    $('.x_team_name').text(vs_team_data?.COMPANY)

    let $price_table = $('table.price')
    let vs_team_price = jsonParse(vs_team_data?.PRICE)
    let team_profit = []
    let vs_team_profit = []
    $price_table.find('tbody').html("")
    $price_table.find('tfoot').html("")

    if (Array.isArray(team_price)){
        $('.before_start_loader').addClass('hidden')
        team_price.forEach((price,indx) => {
            if(indx >= 8) return
            let profit_template = `<td></td><td></td>`
            let highlight_1, highlight_2
            let vs_teamprice = vs_team_price[indx] || ""
            
            if(vs_teamprice) {
                let profit = calculateProfit(price,vs_teamprice)

                if(profit[0] > profit[1]){
                    highlight_1 = `bg-appred-400 text-white`
                } else if(profit[1] > profit[0]){
                    highlight_2 = `bg-appred-400 text-white`
                }

                profit_template = `
                    <td class="${highlight_1}"><span class="currency">${profit[0]}K</span></td>
                    <td class="${highlight_2}"><span class="currency">${profit[1]}K</span></td>`

                    team_profit.push(profit[0])
                    vs_team_profit.push(profit[1])

            }

            let price_template = `<tr class="">
                <td class="text-xs">Month ${indx + 1}</td>
                <td><span class="currency">${price}</span></td>
                <td><span class="currency">${vs_teamprice}</span></td>
                <td class="!border-none"></td>
                ${profit_template}
            </tr>`

            $price_table.find('tbody').append(price_template)
            if(indx == 2 || indx == 6){
                let text = 'Negotiation'
          
                let negoRowTemplate = `<tr class="" style=""><td colspan="100%" style="
                        border: none;
                        padding: 10px 0 0 0;
                    "><div style="
                        display: flex;
                        align-items: center;
                        align-content: center;
                        justify-content: center;
                        background: #5c92b1;
                        color: #fff;
                        gap: 10px;
                        padding: 10px;
                    "><svg width="32" height="18" viewBox="0 0 32 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.17 0.993845L11.33 4.6692C10.525 5.27863 10.37 6.37561 10.98 7.1585C11.625 7.99296 12.88 8.15703 13.745 7.52416L18.71 3.90506C19.06 3.65191 19.56 3.70817 19.835 4.03633C20.11 4.36448 20.045 4.83328 19.695 5.09111L18.65 5.85056L25.6 11.8511V3.00029H25.565L25.37 2.88309L21.74 0.703193C20.975 0.243773 20.08 0 19.17 0C18.08 0 17.02 0.351596 16.17 0.993845ZM17.31 6.82566L14.725 8.71021C13.15 9.86345 10.865 9.56342 9.685 8.04452C8.575 6.6147 8.855 4.61763 10.32 3.50659L14.48 0.351596C13.9 0.121887 13.275 0.00468788 12.64 0.00468788C11.7 -7.16023e-08 10.785 0.262525 10 0.750072L6.4 3.00029V13.5013H7.81L12.38 17.411C13.36 18.2502 14.875 18.1846 15.77 17.2657C16.045 16.9798 16.23 16.6469 16.325 16.3L17.175 17.0313C18.15 17.8705 19.67 17.8095 20.565 16.8954C20.79 16.6657 20.955 16.3985 21.06 16.1219C22.03 16.7313 23.35 16.6047 24.165 15.7703C25.06 14.8561 24.995 13.431 24.02 12.5918L17.31 6.82566ZM0.8 3.00029C0.36 3.00029 0 3.33782 0 3.75036V13.5013C0 14.3311 0.715 15.0014 1.6 15.0014H3.2C4.085 15.0014 4.8 14.3311 4.8 13.5013V3.00029H0.8ZM2.4 12.0012C2.61217 12.0012 2.81566 12.0802 2.96569 12.2208C3.11571 12.3615 3.2 12.5523 3.2 12.7512C3.2 12.9502 3.11571 13.1409 2.96569 13.2816C2.81566 13.4223 2.61217 13.5013 2.4 13.5013C2.18783 13.5013 1.98434 13.4223 1.83431 13.2816C1.68429 13.1409 1.6 12.9502 1.6 12.7512C1.6 12.5523 1.68429 12.3615 1.83431 12.2208C1.98434 12.0802 2.18783 12.0012 2.4 12.0012ZM27.2 3.00029V13.5013C27.2 14.3311 27.915 15.0014 28.8 15.0014H30.4C31.285 15.0014 32 14.3311 32 13.5013V3.75036C32 3.33782 31.64 3.00029 31.2 3.00029H27.2ZM28.8 12.7512C28.8 12.5523 28.8843 12.3615 29.0343 12.2208C29.1843 12.0802 29.3878 12.0012 29.6 12.0012C29.8122 12.0012 30.0157 12.0802 30.1657 12.2208C30.3157 12.3615 30.4 12.5523 30.4 12.7512C30.4 12.9502 30.3157 13.1409 30.1657 13.2816C30.0157 13.4223 29.8122 13.5013 29.6 13.5013C29.3878 13.5013 29.1843 13.4223 29.0343 13.2816C28.8843 13.1409 28.8 12.9502 28.8 12.7512Z" fill="white"></path>
                    </svg>

                    <span style="display: inline-block;">${text}
                    </span></div></td>       
                </tr>`
                $price_table.find('tbody').append(negoRowTemplate)
            }

          

            // append total
            let team_total = team_profit.slice(0,8).reduce((a, b) => a + b, 0)
            let vs_team_total = vs_team_profit.slice(0,8).reduce((a, b) => a + b, 0)
            let yellow_bg1,yellow_bg2
            if(team_total != vs_team_total){
                if(team_total > vs_team_total){
                    yellow_bg1 = 'bg-yellow-300 text-black'
                } else {
                    yellow_bg2 = 'bg-yellow-300 text-black'
                }
            }

            let total_template = `
            <tr class="*:border *:border-gray-300 sm*:px-5 *:border-solid sm*:py-1 *:p-2">
                <td colspan="3" class="font-medium text-base text-center">TOTAL</td>
                <td class="!border-none"></td>
                <td class="${yellow_bg1}"><span class="currency">${team_total}</span></td>
                <td class="${yellow_bg2}"><span class="currency">${vs_team_total}</span></td>
            </tr>`
            $price_table.find('tfoot').html(total_template)

            


        })
    }
    
}

function checkStage(db){
    let stages = db.STAGES
    let last_opened_stage = stages.findLast(i => i.START == 'TRUE')
    let current_stage = last_opened_stage?.STAGE
    let team_id = localStorage['lwa_team_id']
    let price = jsonParse(db.TEAMS.find(i => i.ID == team_id)?.PRICE)
    
    if(current_stage){
        $('.timer-wrapper.hidden').removeClass('hidden')
        let startTime = new Date(last_opened_stage.TIMESTAMP).getTime()
        let mustBeLengthOfPrice = 0
        let rowsHiddenIndex = 0
        if(current_stage == 1){
            mustBeLengthOfPrice = 3
            rowsHiddenIndex = 6
        } else if(current_stage == 2){
            mustBeLengthOfPrice = 7
            rowsHiddenIndex = 11
        } else if(current_stage == 3){
            mustBeLengthOfPrice = 8
            rowsHiddenIndex = 12
        }

        let entryCount = price?.length || 0
        
        entryCount = entryCount<= 8 ? entryCount : 8
        
        
        if( entryCount < mustBeLengthOfPrice){
            $('#price_section form')?.removeClass('_loading')
            $('.before_start_loader').addClass('hidden')
            localStorage['currentMonth'] = Number(entryCount)
            
            if(localStorage['timerStartTime']){
                let localStartTime = new Date(localStorage['timerStartTime']).getTime()
                startTime = localStartTime > startTime ? localStartTime : startTime
            }
    
            updateTimer(startTime,entryCount)
        } else {
            $('#price_section form')?.addClass('_loading')
            $('.timer-wrapper').addClass('hidden')
        }

        // hide other data for stage that's not open

        $('#price_section').find('tr').each(function(indx,e){
            
            if(indx >= rowsHiddenIndex){
                $(this).addClass('hidden')
            } else {
                $(this).removeClass('hidden')
            }
        })

 

    
    } else {
        $('#price_section tr').addClass('hidden')
        $('.timer-wrapper').addClass('hidden')
        $('#price_section form')?.addClass('_loading')
    }

    
    

}

function calculateProfit(a,b){
    let d = {
        '10': {
            '10': [50,50],
            '20': [150,30],
            '30': [150,20]
        },
        '20': {
            '10': [30,150],
            '20': [80,80],
            '30': [180,20]
        },
        '30': {
            '10': [20,150],
            '20': [20,180],
            '30': [110,110]
        },
    }
    return d[a][b]
}


function jsonParse(json){
    if(typeof(json) == 'object') return json
    try {
        return JSON.parse(json)

    } catch (error) {
        return false
    }

}

function updateTimer(startTime,currentMonth){
    clearInterval(TIMER);
     // Duration of the timer in milliseconds (4 minutes)
     let timerDuration = 4 * 60 * 1000;
     if(currentMonth == 0){
        timerDuration = 8 * 60 * 1000;
     }

     // Calculate the end time
     const endTime = startTime + timerDuration;
     
     // Update the timer every second
      TIMER = setInterval(() => {
         // Calculate the remaining time
         const now = Date.now();
         const remainingTime = endTime - now;

         // If the remaining time is less than or equal to 0, stop the timer
         if (remainingTime <= 0) {
             clearInterval(TIMER);
             $('.timer')?.text('Round Ended')
             return;
         }
         // Convert remaining time to minutes and seconds
         const minutes = Math.floor(remainingTime / 1000 / 60);
         const seconds = Math.floor((remainingTime / 1000) % 60).toString().padStart(2, '0');
         // Display the remaining time
         $('.timer')?.text(`${minutes}:${seconds}`)
         $('.current_month').text(currentMonth + 1)
        
     }, 1000);
}
