const STRATEGY_BANK = {
  vocabulary: [
    {prompt:'Cách học từ nào giúp nhớ và dùng được lâu hơn?',options:['Chỉ đọc bản dịch một lần','Học từ trong cụm và tự đặt câu','Chép lại từ thật nhanh','Bỏ qua cách phát âm'],answer:1,explanation:'Học theo cụm và dùng lại trong ngữ cảnh tạo nhiều đường gợi nhớ hơn.'},
    {prompt:'Khi gặp một từ mới, thông tin nào hữu ích nhất để ghi lại?',options:['Chỉ số thứ tự của từ','Cụm từ đi kèm và một ví dụ','Màu của trang sách','Độ dài của từ'],answer:1,explanation:'Collocation và ví dụ giúp bạn biết từ được dùng như thế nào.'},
    {prompt:'Lượt ôn từ hiệu quả nên bắt đầu bằng việc gì?',options:['Nhìn ngay đáp án','Tự nhớ lại trước khi lật thẻ','Học thêm thật nhiều từ mới','Dịch toàn bộ sang tiếng Việt'],answer:1,explanation:'Active recall hiệu quả hơn việc chỉ đọc lại đáp án.'}
  ],
  reading: [
    {prompt:'Trước khi chọn đáp án Reading, bạn nên làm gì?',options:['Chọn theo kiến thức cá nhân','Tìm câu hoặc cụm từ làm bằng chứng','Dịch từng từ trong bài','Chọn phương án dài nhất'],answer:1,explanation:'Đáp án cần được chứng minh bằng thông tin trong đoạn đọc.'},
    {prompt:'Khi câu hỏi dùng từ khác đoạn văn nhưng cùng nghĩa, đó là gì?',options:['Paraphrase','Spelling error','Heading','Prediction'],answer:0,explanation:'IELTS thường paraphrase thông tin thay vì lặp nguyên văn.'},
    {prompt:'Skimming phù hợp nhất khi bạn cần:',options:['Kiểm tra từng giới từ','Nắm ý chính nhanh','Dịch toàn bộ bài','Học thuộc đoạn văn'],answer:1,explanation:'Skimming giúp xác định chủ đề và cấu trúc chung trước khi đọc chi tiết.'}
  ],
  writing: [
    {prompt:'Trước khi viết, bước nào giúp bài rõ ý nhất?',options:['Viết ngay câu đầu tiên','Lập dàn ý ngắn cho luận điểm và ví dụ','Tra mọi từ đồng nghĩa','Viết kết luận trước'],answer:1,explanation:'Dàn ý ngắn giúp kiểm soát lập luận và tránh lặp ý.'},
    {prompt:'Một body paragraph rõ ràng thường bắt đầu bằng:',options:['Một chi tiết ngẫu nhiên','Topic sentence','Câu kết luận toàn bài','Danh sách từ vựng'],answer:1,explanation:'Topic sentence cho người đọc biết luận điểm chính của đoạn.'},
    {prompt:'Khi tự sửa bài, nên ưu tiên kiểm tra điều gì trước?',options:['Ý có trả lời đúng đề không','Có dùng từ thật dài không','Có đủ idiom không','Chữ có nghiêng không'],answer:0,explanation:'Task response/achievement quan trọng hơn việc cố dùng từ phức tạp.'}
  ],
  listening: [
    {prompt:'Trước khi nghe, bạn nên đọc câu hỏi để dự đoán:',options:['Màu nền của bài','Loại thông tin cần nghe','Giọng nói hay nhất','Số lần phát lại'],answer:1,explanation:'Dự đoán tên, số, thời gian hoặc hành động giúp nghe có mục tiêu.'},
    {prompt:'Nếu bỏ lỡ một từ khi nghe, chiến lược tốt nhất là:',options:['Dừng suy nghĩ về cả bài','Tiếp tục nghe ý tiếp theo','Dịch lại từ đầu','Đoán và ngừng nghe'],answer:1,explanation:'Bám theo mạch chính quan trọng hơn mắc kẹt ở một từ.'},
    {prompt:'Shadowing chủ yếu giúp cải thiện:',options:['Tốc độ đọc thầm','Nhịp, nối âm và phản xạ nói','Ngữ pháp viết học thuật','Kỹ năng tra từ điển'],answer:1,explanation:'Lặp gần đồng thời giúp cơ miệng làm quen với nhịp nói tự nhiên.'}
  ],
  speaking: [
    {prompt:'Cách nào giúp duy trì hội thoại tự nhiên?',options:['Chỉ trả lời yes/no','Trả lời rồi hỏi một câu tiếp nối','Nói thật nhanh','Tránh mọi khoảng dừng'],answer:1,explanation:'Answer + follow-up question tạo lượt trao đổi tiếp theo.'},
    {prompt:'Khi chưa nghe rõ, phản ứng phù hợp nhất là:',options:['Giả vờ đã hiểu','Yêu cầu nhắc lại một phần cụ thể','Kết thúc hội thoại','Đổi chủ đề ngay'],answer:1,explanation:'Clarification là kỹ năng giao tiếp bình thường và hữu ích.'},
    {prompt:'Muốn nói trôi chảy hơn, bạn nên ưu tiên:',options:['Câu cực dài và phức tạp','Cụm câu quen thuộc và nhịp ổn định','Không bao giờ tự sửa','Dịch từng từ trong đầu'],answer:1,explanation:'Useful chunks giảm tải khi tạo câu và giúp phản xạ nhanh hơn.'}
  ],
  grammar: [
    {prompt:'Khi học một cấu trúc ngữ pháp mới, thứ tự nào hiệu quả nhất?',options:['Học tên → bỏ qua ví dụ','Hiểu nghĩa → nhận biết → luyện → tự dùng','Chép công thức nhiều lần','Chỉ làm câu khó'],answer:1,explanation:'Đi từ meaning/form đến controlled practice rồi production giúp chuyển kiến thức thành kỹ năng.'}
  ],
  mixed: [
    {prompt:'Checkpoint cuối tuần nên được dùng để:',options:['Chỉ xem điểm','Tìm lỗi lặp lại và chọn nội dung cần ôn','Bỏ qua câu sai','Học càng nhiều chủ đề mới càng tốt'],answer:1,explanation:'Lỗi lặp lại là dữ liệu để điều chỉnh tuần học tiếp theo.'},
    {prompt:'Khi trả lời sai, hành động nào có ích nhất?',options:['Xem đáp án rồi bỏ qua','Giải thích vì sao sai và thử lại sau','Đổi đáp án ngẫu nhiên','Xóa toàn bộ tiến độ'],answer:1,explanation:'Phân tích nguyên nhân giúp tránh lặp lại cùng một lỗi.'}
  ]
};

const OUTCOMES = {
  vocabulary:['Nhớ nghĩa trong ngữ cảnh','Nhận diện hai chiều','Dùng ít nhất một cụm trong câu mới'],
  grammar:['Hiểu ý nghĩa và công thức','Nhận ra lỗi thường gặp','Tự tạo câu đúng'],
  reading:['Đọc có mục tiêu','Tìm bằng chứng trong bài','Diễn đạt lại ý chính'],
  writing:['Xác định yêu cầu đề','Sắp xếp ý trước khi viết','Tự kiểm tra độ rõ và chính xác'],
  listening:['Dự đoán thông tin cần nghe','Bắt chi tiết quan trọng','Diễn đạt lại thông điệp chính'],
  speaking:['Dùng mẫu câu theo tình huống','Phản hồi không dịch từng từ','Duy trì lượt hội thoại'],
  mixed:['Gọi lại kiến thức trong tuần','Nhận diện điểm còn yếu','Chọn nội dung cần ôn']
};

export function expandLearningSession(session) {
  if (!session?.activities?.length || session.learningLoopVersion === 1) return session;
  const skill=session.skill||'mixed', expanded=[];
  for (const activity of session.activities) {
    expanded.push(activity);
    if (activity.type === 'flashcards') expanded.push(...buildCardDrills(activity,skill));
    if (activity.type === 'reading') expanded.push(buildEvidenceTask(session,activity));
    if (activity.type === 'listening') expanded.push(buildListeningTransfer(session,activity));
  }

  const terminal=expanded.filter(item=>item.type==='writing'||item.type==='speaking-live');
  const practice=expanded.filter(item=>!terminal.includes(item));
  const hasProduction=expanded.some(item=>['short','writing','speaking-live'].includes(item.type));
  if (!hasProduction) practice.push(buildApplicationTask(session,expanded));

  const targetBeforeTerminal=5;
  let bankIndex=Math.max(0,(Number(session.week)||1)-1);
  while (practice.length < targetBeforeTerminal) {
    practice.push(buildStrategyCheck(session,bankIndex++));
  }

  const activities=[buildIntro(session),...practice,...terminal,buildRecap(session)];
  return {...session,learningLoopVersion:1,activities};
}

function buildIntro(session){
  const skill=session.skill||'mixed';
  return{id:`${session.id}-objective`,type:'lesson-intro',skill,title:'Mục tiêu phiên học',objective:session.reason||`Luyện ${session.title}.`,outcomes:OUTCOMES[skill]||OUTCOMES.mixed};
}

function buildRecap(session){
  const skill=session.skill||'mixed';
  return{id:`${session.id}-recap`,type:'lesson-recap',skill,title:'Chốt bài & tự đánh giá',checks:OUTCOMES[skill]||OUTCOMES.mixed};
}

function buildCardDrills(activity,skill){
  const cards=(activity.cards||[]).slice(0,4);if(cards.length<2)return[];
  return cards.slice(0,3).map((card,index)=>{
    const reverse=index===2,options=cards.map(item=>String(item[reverse?0:1]).split(' · ')[0]);
    return{id:`${activity.id}-recall-${index+1}`,type:'mcq',skill,title:reverse?'Nhớ lại từ/cụm từ':'Kiểm tra nghĩa',prompt:reverse?`Cách diễn đạt nào phù hợp với “${String(card[1]).split(' · ')[0]}”?`:`“${card[0]}” gần nghĩa nhất với phương án nào?`,options,answer:index,explanation:`${card[0]} = ${card[1]}`};
  });
}

function buildEvidenceTask(session,activity){
  return{id:`${activity.id}-evidence`,type:'short',skill:'reading',title:'Chỉ ra bằng chứng',prompt:`Dựa vào đoạn đọc của bài “${session.title}”, viết một câu ngắn nêu chi tiết đã giúp bạn chọn đáp án.`,sample:activity.explanation||'The passage directly states the key fact that supports the answer.'};
}

function buildListeningTransfer(session,activity){
  return{id:`${activity.id}-transfer`,type:'short',skill:'listening',title:'Nghe lại & diễn đạt',prompt:'Nghe lại một lần, sau đó viết một câu tiếng Anh tóm tắt thông tin quan trọng nhất.',sample:activity.text||'Write the main message in your own words.'};
}

function buildApplicationTask(session,activities){
  const skill=session.skill||'mixed',cards=activities.find(item=>item.cards)?.cards||[];
  if(skill==='vocabulary')return{id:`${session.id}-apply`,type:'short',skill,title:'Dùng từ trong ngữ cảnh',prompt:`Viết 2 câu liên quan đến “${session.title}”, sử dụng ít nhất hai từ/cụm từ vừa học.`,sample:cards.slice(0,2).map(item=>item[0]).join(' · ')||'Use two target expressions in meaningful sentences.'};
  if(skill==='reading')return{id:`${session.id}-apply`,type:'short',skill,title:'Tóm tắt một câu',prompt:'Viết một câu tiếng Anh tóm tắt ý chính, không chép nguyên văn đoạn đọc.',sample:'The passage explains the main change and the factor behind it.'};
  if(skill==='listening')return{id:`${session.id}-apply`,type:'short',skill,title:'Phản hồi thông tin vừa nghe',prompt:'Viết một câu phản hồi phù hợp với thông tin bạn vừa nghe.',sample:'Thanks, I understand the key detail and what I need to do next.'};
  if(skill==='speaking')return{id:`${session.id}-apply`,type:'short',skill,title:'Phản xạ theo tình huống',prompt:`Viết 2–3 câu bạn sẽ nói trong tình huống “${session.title}”.`,sample:'Give a clear response, add one useful detail, then ask a follow-up question.'};
  return{id:`${session.id}-apply`,type:'short',skill,title:'Vận dụng',prompt:`Viết một ví dụ ngắn áp dụng nội dung “${session.title}”.`,sample:'Use today’s target language in a clear, realistic context.'};
}

function buildStrategyCheck(session,index){
  const skill=session.skill||'mixed',bank=STRATEGY_BANK[skill]||STRATEGY_BANK.mixed,item=bank[index%bank.length];
  return{id:`${session.id}-strategy-${index+1}`,type:'mcq',skill,title:'Chiến lược học',...item};
}
